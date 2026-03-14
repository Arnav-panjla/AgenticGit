/**
 * AgentBranch SDK v2
 *
 * Core functions for AI agents to interact with the version control system.
 * v2 adds: semantic commits, reasoning graph, replay traces
 */

import { query, queryOne } from '../db/client';
import { storeContent, retrieveContent } from '../services/fileverse';
import { validateEnsName } from '../services/ens';
import * as bountyService from '../services/bounty';
import { processCommitSemantics, generateEmbedding, isEmbeddingsEnabled } from '../services/embeddings';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  ens_name: string;
  role: string;
  capabilities: string[];
  reputation_score: number;
  user_id?: string;
  deposit_tx_hash?: string;
  deposit_verified?: boolean;
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

export type ReasoningType = 'knowledge' | 'hypothesis' | 'experiment' | 'conclusion' | 'trace';

export interface TraceData {
  prompt: string;
  context: Record<string, any>;
  tools: Array<{ name: string; input: any; output: any }>;
  result: string;
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
  // Semantic fields (v2)
  embedding?: number[];
  semantic_summary?: string;
  tags?: string[];
  // Reasoning graph fields (v2)
  reasoning_type?: ReasoningType;
  // Replay trace fields (v2)
  trace_prompt?: string;
  trace_context?: Record<string, any>;
  trace_tools?: Array<{ name: string; input: any; output: any }>;
  trace_result?: string;
  // Populated by readMemory
  content?: string;
  author_ens?: string;
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

export interface CommitOptions {
  contentType?: string;
  reasoningType?: ReasoningType;
  trace?: TraceData;
  skipSemantics?: boolean;
}

export interface SearchResult {
  commit: Commit;
  similarity: number;
}

export interface GraphNode {
  commit: Commit;
  children: GraphNode[];
}

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

// ─── Commit (v2 with semantic features) ───────────────────────────────────────

export async function commitMemory(
  repoId: string,
  branchName: string,
  content: string,
  message: string,
  authorEns: string,
  options: CommitOptions = {}
): Promise<Commit> {
  const { contentType = 'text', reasoningType, trace, skipSemantics = false } = options;

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

  // Process semantic features (unless skipped)
  let embedding: number[] | null = null;
  let semanticSummary: string | null = null;
  let tags: string[] = [];

  if (!skipSemantics && isEmbeddingsEnabled()) {
    try {
      const semantics = await processCommitSemantics(content, message);
      embedding = semantics.embedding;
      semanticSummary = semantics.summary;
      tags = semantics.tags;
    } catch (error) {
      console.error('Semantic processing failed:', error);
    }
  }

  // Build insert query with all v2 fields
  const [commit] = await query<Commit>(
    `INSERT INTO commits (
      repo_id, branch_id, author_agent_id, message, content_ref, content_type,
      parent_commit_id, embedding, semantic_summary, tags, reasoning_type,
      trace_prompt, trace_context, trace_tools, trace_result
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      repoId,
      branch.id,
      author.id,
      message,
      contentRef,
      contentType,
      parent?.id ?? null,
      embedding ? `[${embedding.join(',')}]` : null,
      semanticSummary,
      tags,
      reasoningType ?? null,
      trace?.prompt ?? null,
      trace?.context ? JSON.stringify(trace.context) : null,
      trace?.tools ? JSON.stringify(trace.tools) : null,
      trace?.result ?? null,
    ]
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
  const levelOrder: Record<PermissionLevel, number> = { public: 0, team: 1, restricted: 2, encrypted: 3 };

  for (const commit of commits) {
    const agentLevel = levelOrder[permLevel];
    
    // Permission logic:
    // - Owners can see everything
    // - 'public' commits are readable by everyone
    // - 'team' commits require team level or higher
    // - 'restricted' commits require restricted level or higher
    // - 'encrypted' commits require encrypted level (or owner)
    const commitLevel = levelOrder['public']; // All commits are public visibility by default
    const contentAllowed = isOwner || agentLevel >= commitLevel;

    if (!contentAllowed) {
      commit.content = '[REDACTED — insufficient permissions]';
    } else if (permLevel === 'encrypted' && !isOwner) {
      commit.content = '[REDACTED — encrypted content]';
    } else {
      commit.content = (await retrieveContent(commit.content_ref)) ?? '[content not found]';
    }
  }

  return commits;
}

// ─── Semantic Search (v2) ─────────────────────────────────────────────────────

export async function searchCommits(
  repoId: string,
  queryText: string,
  limit: number = 10
): Promise<SearchResult[]> {
  // Try vector similarity search first
  if (isEmbeddingsEnabled()) {
    const queryEmbedding = await generateEmbedding(queryText);

    if (queryEmbedding) {
      const results = await query<Commit & { similarity: number }>(
        `SELECT c.*, a.ens_name as author_ens, b.name as branch_name,
                1 - (c.embedding <=> $1::vector) as similarity
         FROM commits c
         JOIN agents a ON c.author_agent_id = a.id
         JOIN branches b ON c.branch_id = b.id
         WHERE c.repo_id = $2 AND c.embedding IS NOT NULL
         ORDER BY c.embedding <=> $1::vector
         LIMIT $3`,
        [`[${queryEmbedding.join(',')}]`, repoId, limit]
      );

      return results.map(r => ({
        commit: r,
        similarity: r.similarity,
      }));
    }
  }

  // Fallback to full-text search
  const results = await query<Commit & { rank: number }>(
    `SELECT c.*, a.ens_name as author_ens, b.name as branch_name,
            ts_rank(c.search_vector, plainto_tsquery('english', $1)) as rank
     FROM commits c
     JOIN agents a ON c.author_agent_id = a.id
     JOIN branches b ON c.branch_id = b.id
     WHERE c.repo_id = $2 AND c.search_vector @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $3`,
    [queryText, repoId, limit]
  );

  return results.map(r => ({
    commit: r,
    similarity: Math.min(1, r.rank / 10), // Normalize rank to 0-1
  }));
}

// ─── Reasoning Graph (v2) ─────────────────────────────────────────────────────

export async function getCommitGraph(
  repoId: string,
  rootCommitId?: string
): Promise<GraphNode[]> {
  // Get all commits with reasoning types
  const commits = await query<Commit>(
    `SELECT c.*, a.ens_name as author_ens, b.name as branch_name
     FROM commits c
     JOIN agents a ON c.author_agent_id = a.id
     JOIN branches b ON c.branch_id = b.id
     WHERE c.repo_id = $1 AND c.reasoning_type IS NOT NULL
     ORDER BY c.created_at ASC`,
    [repoId]
  );

  // Build adjacency map
  const commitMap = new Map<string, Commit>();
  const childrenMap = new Map<string, string[]>();

  for (const commit of commits) {
    commitMap.set(commit.id, commit);
    if (commit.parent_commit_id) {
      const children = childrenMap.get(commit.parent_commit_id) || [];
      children.push(commit.id);
      childrenMap.set(commit.parent_commit_id, children);
    }
  }

  // Build tree recursively
  function buildNode(commitId: string): GraphNode {
    const commit = commitMap.get(commitId)!;
    const childIds = childrenMap.get(commitId) || [];
    return {
      commit,
      children: childIds.map(id => buildNode(id)),
    };
  }

  // Find root nodes (commits without parents or with specified root)
  if (rootCommitId) {
    if (commitMap.has(rootCommitId)) {
      return [buildNode(rootCommitId)];
    }
    return [];
  }

  const roots = commits.filter(c => !c.parent_commit_id || !commitMap.has(c.parent_commit_id));
  return roots.map(c => buildNode(c.id));
}

// ─── Replay Trace (v2) ────────────────────────────────────────────────────────

export async function getCommitReplay(commitId: string): Promise<{
  commit: Commit;
  trace: TraceData | null;
  reasoningChain: Commit[];
}> {
  const commit = await queryOne<Commit>(
    `SELECT c.*, a.ens_name as author_ens, b.name as branch_name
     FROM commits c
     JOIN agents a ON c.author_agent_id = a.id
     JOIN branches b ON c.branch_id = b.id
     WHERE c.id = $1`,
    [commitId]
  );

  if (!commit) {
    throw new Error(`Commit not found: ${commitId}`);
  }

  // Resolve content
  commit.content = (await retrieveContent(commit.content_ref)) ?? '[content not found]';

  // Build trace data if available
  let trace: TraceData | null = null;
  if (commit.trace_prompt) {
    trace = {
      prompt: commit.trace_prompt,
      context: commit.trace_context || {},
      tools: commit.trace_tools || [],
      result: commit.trace_result || '',
    };
  }

  // Get reasoning chain (ancestors with reasoning types)
  const reasoningChain: Commit[] = [];
  let currentId: string | null = commit.parent_commit_id;

  while (currentId) {
    const parent = await queryOne<Commit>(
      `SELECT c.*, a.ens_name as author_ens, b.name as branch_name
       FROM commits c
       JOIN agents a ON c.author_agent_id = a.id
       JOIN branches b ON c.branch_id = b.id
       WHERE c.id = $1 AND c.reasoning_type IS NOT NULL`,
      [currentId]
    );

    if (parent) {
      parent.content = (await retrieveContent(parent.content_ref)) ?? '[content not found]';
      reasoningChain.unshift(parent);
      currentId = parent.parent_commit_id;
    } else {
      // Check if there's a non-reasoning parent to continue the chain
      const anyParent = await queryOne<{ parent_commit_id: string | null }>(
        'SELECT parent_commit_id FROM commits WHERE id = $1',
        [currentId]
      );
      currentId = anyParent?.parent_commit_id ?? null;
    }
  }

  return { commit, trace, reasoningChain };
}

// ─── Context Chain (v3) ───────────────────────────────────────────────────────

/**
 * Agent handoff segment — a sequence of commits by a single agent
 * before the next agent takes over.
 */
export interface HandoffSegment {
  agent: {
    id: string;
    ens_name: string;
    role: string | null;
  };
  commits: Array<{
    id: string;
    message: string;
    semantic_summary: string | null;
    reasoning_type: string | null;
    tags: string[];
    created_at: string;
    branch_name: string;
  }>;
  /** Summary of what this agent contributed */
  contribution_summary: string | null;
}

export interface ContextChain {
  repo_id: string;
  total_commits: number;
  total_agents: number;
  handoffs: HandoffSegment[];
}

/**
 * Get the context chain for a repository — all commits ordered chronologically,
 * grouped by consecutive agent handoffs. This shows how agents build on each
 * other's knowledge and when control passes between agents.
 */
export async function getContextChain(
  repoId: string,
  branchName?: string
): Promise<ContextChain> {
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

  const commits = await query<Commit & { author_role: string | null }>(
    `SELECT c.*, a.ens_name as author_ens, a.role as author_role, b.name as branch_name
     FROM commits c
     JOIN agents a ON c.author_agent_id = a.id
     JOIN branches b ON c.branch_id = b.id
     WHERE c.repo_id = $1 ${branchFilter}
     ORDER BY c.created_at ASC`,
    params
  );

  // Group consecutive commits by the same agent into handoff segments
  const handoffs: HandoffSegment[] = [];
  let currentSegment: HandoffSegment | null = null;

  for (const commit of commits) {
    if (!currentSegment || currentSegment.agent.id !== commit.author_agent_id) {
      // New agent handoff
      currentSegment = {
        agent: {
          id: commit.author_agent_id,
          ens_name: commit.author_ens || '',
          role: (commit as any).author_role || null,
        },
        commits: [],
        contribution_summary: null,
      };
      handoffs.push(currentSegment);
    }

    currentSegment.commits.push({
      id: commit.id,
      message: commit.message,
      semantic_summary: commit.semantic_summary || null,
      reasoning_type: commit.reasoning_type || null,
      tags: commit.tags || [],
      created_at: commit.created_at,
      branch_name: commit.branch_name || '',
    });
  }

  // Build contribution summaries from the last semantic_summary in each segment
  for (const segment of handoffs) {
    const summaries = segment.commits
      .filter(c => c.semantic_summary)
      .map(c => c.semantic_summary!);
    if (summaries.length > 0) {
      segment.contribution_summary = summaries[summaries.length - 1];
    }
  }

  // Count unique agents
  const uniqueAgents = new Set(commits.map(c => c.author_agent_id));

  return {
    repo_id: repoId,
    total_commits: commits.length,
    total_agents: uniqueAgents.size,
    handoffs,
  };
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
    `INSERT INTO pull_requests (repo_id, source_branch_id, target_branch_id, author_agent_id, description, bounty_amount)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [repoId, source.id, target.id, author.id, description, bountyAmount]
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

  // Bump reviewer reputation for completing a review
  await query(
    `UPDATE agents SET reputation_score = reputation_score + 5 WHERE id = $1`,
    [reviewer.id]
  );

  return merged;
}
