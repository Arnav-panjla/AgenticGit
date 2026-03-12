/**
 * AgentBranch SDK
 *
 * Core functions for AI agents to interact with the version control system.
 */

import { query, queryOne } from '../db/client';
import { storeContent, retrieveContent } from '../services/fileverse';
import { validateEnsName } from '../services/ens';
import * as bountyService from '../services/bounty';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  ens_name: string;
  role: string;
  capabilities: string[];
  reputation_score: number;
  created_at: string;
}

export interface Repository {
  id: string;
  name: string;
  description: string;
  owner_agent_id: string;
  bounty_pool: number;
  created_at: string;
}

export interface Branch {
  id: string;
  repo_id: string;
  name: string;
  base_branch_id: string | null;
  created_by: string;
  created_at: string;
}

export interface Commit {
  id: string;
  repo_id: string;
  branch_id: string;
  author_agent_id: string;
  message: string;
  content_ref: string;
  content_type: string;
  parent_commit_id: string | null;
  created_at: string;
  content?: string;           // populated by readMemory
  author_ens?: string;        // populated by readMemory
  branch_name?: string;
}

export interface PullRequest {
  id: string;
  repo_id: string;
  source_branch_id: string;
  target_branch_id: string;
  author_agent_id: string;
  reviewer_agent_id: string | null;
  description: string;
  status: 'open' | 'approved' | 'merged' | 'rejected';
  bounty_amount: number;
  created_at: string;
  merged_at: string | null;
}

export type PermissionLevel = 'public' | 'team' | 'restricted' | 'encrypted';

// ─── Agent ────────────────────────────────────────────────────────────────────

export async function registerAgent(
  ensName: string,
  role: string,
  capabilities: string[] = []
): Promise<Agent> {
  if (!validateEnsName(ensName)) {
    throw new Error(`Invalid ENS name: "${ensName}". Must match pattern agent.eth`);
  }

  const existing = await queryOne<Agent>('SELECT * FROM agents WHERE ens_name = $1', [ensName]);
  if (existing) return existing;

  const [agent] = await query<Agent>(
    `INSERT INTO agents (ens_name, role, capabilities)
     VALUES ($1, $2, $3) RETURNING *`,
    [ensName, role, capabilities]
  );
  return agent;
}

export async function getAgent(ensName: string): Promise<Agent | null> {
  return queryOne<Agent>('SELECT * FROM agents WHERE ens_name = $1', [ensName]);
}

// ─── Repository ───────────────────────────────────────────────────────────────

export async function createRepository(
  name: string,
  ownerEns: string,
  description: string = '',
  initialPermission: PermissionLevel = 'public'
): Promise<Repository> {
  const owner = await getAgent(ownerEns);
  if (!owner) throw new Error(`Agent not found: ${ownerEns}`);

  const [repo] = await query<Repository>(
    `INSERT INTO repositories (name, description, owner_agent_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [name, description, owner.id]
  );

  // Create default permission (applies to all agents)
  await query(
    `INSERT INTO permissions (repo_id, agent_id, level) VALUES ($1, NULL, $2)`,
    [repo.id, initialPermission]
  );

  // Automatically create the main branch
  await query(
    `INSERT INTO branches (repo_id, name, base_branch_id, created_by)
     VALUES ($1, 'main', NULL, $2)`,
    [repo.id, owner.id]
  );

  return repo;
}

// ─── Branch ───────────────────────────────────────────────────────────────────

export async function createBranch(
  repoId: string,
  branchName: string,
  baseBranchName: string,
  creatorEns: string
): Promise<Branch> {
  const creator = await getAgent(creatorEns);
  if (!creator) throw new Error(`Agent not found: ${creatorEns}`);

  const base = await queryOne<Branch>(
    'SELECT * FROM branches WHERE repo_id = $1 AND name = $2',
    [repoId, baseBranchName]
  );
  if (!base) throw new Error(`Base branch "${baseBranchName}" not found in repo ${repoId}`);

  const existing = await queryOne<Branch>(
    'SELECT * FROM branches WHERE repo_id = $1 AND name = $2',
    [repoId, branchName]
  );
  if (existing) return existing;

  const [branch] = await query<Branch>(
    `INSERT INTO branches (repo_id, name, base_branch_id, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [repoId, branchName, base.id, creator.id]
  );
  return branch;
}

// ─── Commit ───────────────────────────────────────────────────────────────────

export async function commitMemory(
  repoId: string,
  branchName: string,
  content: string,
  message: string,
  authorEns: string,
  contentType: string = 'text'
): Promise<Commit> {
  const author = await getAgent(authorEns);
  if (!author) throw new Error(`Agent not found: ${authorEns}`);

  const branch = await queryOne<Branch>(
    'SELECT * FROM branches WHERE repo_id = $1 AND name = $2',
    [repoId, branchName]
  );
  if (!branch) throw new Error(`Branch "${branchName}" not found in repo ${repoId}`);

  // Find parent commit
  const parent = await queryOne<Commit>(
    'SELECT id FROM commits WHERE branch_id = $1 ORDER BY created_at DESC LIMIT 1',
    [branch.id]
  );

  // Store content in Fileverse
  const contentRef = await storeContent(content);

  const [commit] = await query<Commit>(
    `INSERT INTO commits (repo_id, branch_id, author_agent_id, message, content_ref, content_type, parent_commit_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [repoId, branch.id, author.id, message, contentRef, contentType, parent?.id ?? null]
  );
  return commit;
}

// ─── Read Memory ──────────────────────────────────────────────────────────────

export async function readMemory(
  repoId: string,
  agentEns: string,
  branchName?: string
): Promise<Commit[]> {
  // Determine this agent's permission level for this repo
  const agent = await getAgent(agentEns);

  let permLevel: PermissionLevel = 'public';
  if (agent) {
    const perm = await queryOne<{ level: PermissionLevel }>(
      `SELECT level FROM permissions WHERE repo_id = $1 AND (agent_id = $2 OR agent_id IS NULL)
       ORDER BY agent_id NULLS LAST LIMIT 1`,
      [repoId, agent.id]
    );
    if (perm) permLevel = perm.level;
  }

  // Check repo owner — owners have full access
  const repo = await queryOne<Repository>('SELECT * FROM repositories WHERE id = $1', [repoId]);
  const isOwner = repo && agent && repo.owner_agent_id === agent.id;

  // Build query
  let branchFilter = '';
  const params: any[] = [repoId];

  if (branchName) {
    const branch = await queryOne<Branch>(
      'SELECT id FROM branches WHERE repo_id = $1 AND name = $2',
      [repoId, branchName]
    );
    if (branch) {
      params.push(branch.id);
      branchFilter = `AND c.branch_id = $${params.length}`;
    }
  }

  const commits = await query<Commit>(
    `SELECT c.*, a.ens_name as author_ens, b.name as branch_name
     FROM commits c
     JOIN agents a ON c.author_agent_id = a.id
     JOIN branches b ON c.branch_id = b.id
     WHERE c.repo_id = $1 ${branchFilter}
     ORDER BY c.created_at DESC`,
    params
  );

  // Resolve content from Fileverse and apply permission filtering
  const levelOrder = { public: 0, team: 1, restricted: 2, encrypted: 3 };

  for (const commit of commits) {
    const agentLevel = levelOrder[permLevel];
    const contentAllowed = isOwner || agentLevel >= 0; // public is always readable

    if (permLevel === 'encrypted' && !isOwner) {
      commit.content = '[REDACTED — encrypted content]';
    } else {
      commit.content = (await retrieveContent(commit.content_ref)) ?? '[content not found]';
    }
  }

  return commits;
}

// ─── Pull Request ─────────────────────────────────────────────────────────────

export async function openPullRequest(
  repoId: string,
  sourceBranchName: string,
  targetBranchName: string,
  description: string,
  authorEns: string,
  bountyAmount: number = 0
): Promise<PullRequest> {
  const author = await getAgent(authorEns);
  if (!author) throw new Error(`Agent not found: ${authorEns}`);

  const source = await queryOne<Branch>(
    'SELECT * FROM branches WHERE repo_id = $1 AND name = $2',
    [repoId, sourceBranchName]
  );
  if (!source) throw new Error(`Branch "${sourceBranchName}" not found`);

  const target = await queryOne<Branch>(
    'SELECT * FROM branches WHERE repo_id = $1 AND name = $2',
    [repoId, targetBranchName]
  );
  if (!target) throw new Error(`Branch "${targetBranchName}" not found`);

  const [pr] = await query<PullRequest>(
    `INSERT INTO pull_requests (repo_id, source_branch_id, target_branch_id, author_agent_id, description)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [repoId, source.id, target.id, author.id, description]
  );

  // Escrow bounty if provided
  if (bountyAmount > 0) {
    await bountyService.escrow(repoId, author.id, bountyAmount, pr.id);
  }

  return pr;
}

export async function mergePullRequest(
  prId: string,
  reviewerEns: string
): Promise<PullRequest> {
  const reviewer = await getAgent(reviewerEns);
  if (!reviewer) throw new Error(`Reviewer agent not found: ${reviewerEns}`);

  const pr = await queryOne<PullRequest>('SELECT * FROM pull_requests WHERE id = $1', [prId]);
  if (!pr) throw new Error(`Pull request not found: ${prId}`);
  if (pr.status !== 'open') throw new Error(`PR is already ${pr.status}`);

  const [merged] = await query<PullRequest>(
    `UPDATE pull_requests
     SET status = 'merged', reviewer_agent_id = $1, merged_at = NOW()
     WHERE id = $2 RETURNING *`,
    [reviewer.id, prId]
  );

  // Release bounty to PR author
  if (pr.bounty_amount > 0) {
    await bountyService.release(pr.repo_id, pr.author_agent_id, pr.bounty_amount, prId);
  }

  return merged;
}
