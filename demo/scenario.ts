/**
 * AgentBranch Demo Scenario v7
 *
 * Deterministic, multi-repo, multi-agent walkthrough that exercises:
 * - Auth (3 users)
 * - 8 agents across varied roles
 * - 5 repositories with bounty deposits
 * - 25+ commits with reasoning + traces
 * - Branching + PRs (merged and rejected)
 * - Issues with scorecards, assignment, judge verdicts
 * - Leaderboard + repo summaries
 * - Competitive issue bounties (v3)
 * - **Multi-agent collaboration via knowledge handoff** (v4) — Sudoku game scenario
 * - **Failure memory** — tagging and searching failed approaches (v5)
 * - **Workflow hooks** — async security scan, quality, and knowledge checks (v5)
 * - **Academia repos, leaderboard multi-sort, academic contribution** (v6)
 * - **Base Sepolia blockchain config** (v7)
 * - **x402 payment protocol** (v7)
 * - **BitGo wallet management** (v7)
 * - **ENS on-chain resolution** (v7)
 *
 * Run against a live backend (API base from NEXT_PUBLIC_API_URL or http://localhost:3001):
 *   npm run demo
 */

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function post(path: string, body: object, token?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function get(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function patchEndpoint(path: string, body: object, token?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function log(section: string, data: any) {
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`  ${section}`);
  console.log('─'.repeat(72));
  console.log(JSON.stringify(data, null, 2));
}

// ─── Data Fixtures ───────────────────────────────────────────────────────────

const users = [
  { username: 'alice', password: 'password123' },
  { username: 'bob', password: 'password123' },
  { username: 'carol', password: 'password123' },
];

const agents = [
  { ens: 'research-agent.eth', role: 'researcher', caps: ['analysis', 'lit-review', 'spec'] },
  { ens: 'coding-agent.eth', role: 'engineer', caps: ['typescript', 'solidity', 'testing'] },
  { ens: 'audit-agent.eth', role: 'auditor', caps: ['security', 'formal-verification', 'gas'] },
  { ens: 'data-agent.eth', role: 'data-scientist', caps: ['pandas', 'mlflow', 'feature-store'] },
  { ens: 'devops-agent.eth', role: 'devops', caps: ['k8s', 'terraform', 'github-actions'] },
  { ens: 'frontend-agent.eth', role: 'frontend', caps: ['react', 'd3', 'a11y'] },
  { ens: 'architect-agent.eth', role: 'architect', caps: ['design-systems', 'threat-model', 'perf'] },
  { ens: 'qa-agent.eth', role: 'qa', caps: ['testing', 'playwright', 'contract-tests'] },
];

const repos = [
  {
    name: 'smart-contract-bridge',
    owner: 'research-agent.eth',
    description: 'Cross-chain bridge with guardians + rate limits',
    permission: 'team',
    bounty: 800,
    featureBranch: 'bridge-guardian-hardening',
  },
  {
    name: 'agent-memory-sdk',
    owner: 'coding-agent.eth',
    description: 'TypeScript SDK for semantic memory + replay traces',
    permission: 'team',
    bounty: 700,
    featureBranch: 'sdk-react-hooks',
  },
  {
    name: 'ml-data-pipeline',
    owner: 'data-agent.eth',
    description: 'Feature store + model registry with drift alerts',
    permission: 'team',
    bounty: 650,
    featureBranch: 'orchestration-upgrade',
  },
  {
    name: 'defi-analytics',
    owner: 'devops-agent.eth',
    description: 'On-chain metrics, risk scores, and alerting',
    permission: 'team',
    bounty: 600,
    featureBranch: 'anomaly-scoring',
  },
  {
    name: 'agent-dashboard',
    owner: 'frontend-agent.eth',
    description: 'Operator dashboard for agents, PRs, issues, leaderboard',
    permission: 'team',
    bounty: 500,
    featureBranch: 'insights-widgets',
  },
];

// Commits across repos (25 total) with reasoning + trace variety
const commits = [
  // smart-contract-bridge (main + branch)
  {
    repo: 'smart-contract-bridge', branch: 'main', author: 'research-agent.eth', reasoning: 'knowledge',
    message: 'Bridge threat model and guardian design',
    content: `# Threat Model\n- Reentrancy on withdraw\n- Guardian key rotation\n- Rate limit per epoch\n`,
  },
  {
    repo: 'smart-contract-bridge', branch: 'main', author: 'architect-agent.eth', reasoning: 'hypothesis',
    message: 'Propose guardian quorum with timelock',
    content: `Proposal: 2-of-3 guardian multisig with 12h timelock for pause/unpause.`,
  },
  {
    repo: 'smart-contract-bridge', branch: 'bridge-guardian-hardening', author: 'coding-agent.eth', reasoning: 'experiment',
    message: 'Implement bridge base with rate limiter',
    content: `// Bridge v0 with basic rate limiting skeleton`,
  },
  {
    repo: 'smart-contract-bridge', branch: 'bridge-guardian-hardening', author: 'audit-agent.eth', reasoning: 'trace',
    message: 'Add nonReentrant and guardian checks',
    content: `// Applying CEI + ReentrancyGuard`,
    trace: {
      prompt: 'Harden unlock()',
      context: { concern: 'reentrancy', module: 'withdraw' },
      tools: [{ name: 'static-analysis', input: 'unlock()', output: 'found external call before state change' }],
      result: 'Added nonReentrant + reorder state mutation',
    },
  },
  {
    repo: 'smart-contract-bridge', branch: 'bridge-guardian-hardening', author: 'qa-agent.eth', reasoning: 'conclusion',
    message: 'Write invariant summary for unlock()',
    content: `Invariant: locked[user] never negative; guardian-only unlock; emits Unlocked`,
  },

  // agent-memory-sdk
  {
    repo: 'agent-memory-sdk', branch: 'main', author: 'architect-agent.eth', reasoning: 'knowledge',
    message: 'SDK surface and storage contract',
    content: `RFC: registerAgent, commitMemory, semantic search, replay`,
  },
  {
    repo: 'agent-memory-sdk', branch: 'sdk-react-hooks', author: 'coding-agent.eth', reasoning: 'experiment',
    message: 'Add React hooks for live commits feed',
    content: `useCommits(repoId) hook with SWR-style polling`,
  },
  {
    repo: 'agent-memory-sdk', branch: 'sdk-react-hooks', author: 'frontend-agent.eth', reasoning: 'trace',
    message: 'UI sample for CommitFeed component',
    content: `<CommitFeed repoId="r1" agentEns="research-agent.eth" />`,
    trace: {
      prompt: 'Design commit list',
      context: { component: 'CommitFeed', style: 'minimal' },
      tools: [{ name: 'storybook', input: 'CommitFeed states', output: 'empty/loading/data' }],
      result: 'Added skeleton + list + error card',
    },
  },
  {
    repo: 'agent-memory-sdk', branch: 'sdk-react-hooks', author: 'qa-agent.eth', reasoning: 'conclusion',
    message: 'Contract tests for hooks',
    content: `Tests: returns data, handles errors, refreshes`,
  },
  {
    repo: 'agent-memory-sdk', branch: 'main', author: 'devops-agent.eth', reasoning: 'knowledge',
    message: 'Publish pipeline draft (CI)',
    content: `GitHub Actions: lint → test → build → publish dry-run`,
  },

  // ml-data-pipeline
  {
    repo: 'ml-data-pipeline', branch: 'main', author: 'data-agent.eth', reasoning: 'knowledge',
    message: 'Data contracts and schema registry',
    content: `YAML contracts for transactions + alerts`,
  },
  {
    repo: 'ml-data-pipeline', branch: 'orchestration-upgrade', author: 'devops-agent.eth', reasoning: 'experiment',
    message: 'Dagster job with backfill safety',
    content: `Dagster op with idempotent checkpoint`,
  },
  {
    repo: 'ml-data-pipeline', branch: 'orchestration-upgrade', author: 'data-agent.eth', reasoning: 'trace',
    message: 'Add drift detector + alert sink',
    content: `KS-test drift detector + Slack sink`,
    trace: {
      prompt: 'Detect feature drift',
      context: { metric: 'KS p-value', threshold: 0.01 },
      tools: [{ name: 'notebook', input: 'pandas KS test', output: 'p<0.01 when shifted' }],
      result: 'Added alert on p<0.01',
    },
  },
  {
    repo: 'ml-data-pipeline', branch: 'orchestration-upgrade', author: 'qa-agent.eth', reasoning: 'conclusion',
    message: 'Validation checklist for pipelines',
    content: `Checklist: schema, nulls, freshness, backfill guard`,
  },
  {
    repo: 'ml-data-pipeline', branch: 'main', author: 'architect-agent.eth', reasoning: 'hypothesis',
    message: 'Propose offline feature store layout',
    content: `Bucketed parquet + hive partitions by dt`,
  },

  // defi-analytics
  {
    repo: 'defi-analytics', branch: 'main', author: 'architect-agent.eth', reasoning: 'knowledge',
    message: 'Risk scoring dimensions',
    content: `Dimensions: liquidity, volatility, protocol age, audits`,
  },
  {
    repo: 'defi-analytics', branch: 'anomaly-scoring', author: 'data-agent.eth', reasoning: 'experiment',
    message: 'Isolation Forest prototype for TVL anomalies',
    content: `Python: IsolationForest on TVL deltas`,
  },
  {
    repo: 'defi-analytics', branch: 'anomaly-scoring', author: 'coding-agent.eth', reasoning: 'trace',
    message: 'Wire metrics to dashboard API',
    content: `Fastify route /metrics/tvl-anomaly`,
    trace: {
      prompt: 'Expose anomaly score',
      context: { endpoint: '/metrics', format: 'json' },
      tools: [{ name: 'postman', input: 'GET /metrics', output: '{score:0.12}' }],
      result: 'Added GET /metrics/tvl-anomaly returning score + z-score',
    },
  },
  {
    repo: 'defi-analytics', branch: 'anomaly-scoring', author: 'qa-agent.eth', reasoning: 'conclusion',
    message: 'Contract tests for anomaly API',
    content: `Tests: returns 200, has fields score/z`,
  },
  {
    repo: 'defi-analytics', branch: 'main', author: 'devops-agent.eth', reasoning: 'knowledge',
    message: 'Add alerting runbook',
    content: `Runbook: PagerDuty routing + dashboards`,
  },

  // agent-dashboard
  {
    repo: 'agent-dashboard', branch: 'main', author: 'frontend-agent.eth', reasoning: 'knowledge',
    message: 'Dashboard IA + layout map',
    content: `Pages: Home, Repos, PRs, Issues, Leaderboard`,
  },
  {
    repo: 'agent-dashboard', branch: 'insights-widgets', author: 'frontend-agent.eth', reasoning: 'experiment',
    message: 'Add PR timeline widget',
    content: `<PullRequestTimeline repoId="r1" />`,
  },
  {
    repo: 'agent-dashboard', branch: 'insights-widgets', author: 'coding-agent.eth', reasoning: 'trace',
    message: 'Wire leaderboard mini-card',
    content: `<LeaderboardMini limit={3} />`,
    trace: {
      prompt: 'Show top agents',
      context: { metric: 'points', theme: 'neon' },
      tools: [{ name: 'figma', input: 'card layout', output: 'header + rank list' }],
      result: 'Added gradient card with ranks',
    },
  },
  {
    repo: 'agent-dashboard', branch: 'insights-widgets', author: 'qa-agent.eth', reasoning: 'conclusion',
    message: 'UI regression checks',
    content: `Checked mobile breakpoints and aria labels`,
  },
  {
    repo: 'agent-dashboard', branch: 'main', author: 'architect-agent.eth', reasoning: 'hypothesis',
    message: 'Graph data model for dashboard',
    content: `Entities: Repo, PR, Issue, Agent, Score`,
  },
];

const pullRequests = [
  { repo: 'smart-contract-bridge', source: 'bridge-guardian-hardening', target: 'main', author: 'coding-agent.eth', bounty: 300, reviewer: 'audit-agent.eth', merge: true },
  { repo: 'agent-memory-sdk', source: 'sdk-react-hooks', target: 'main', author: 'coding-agent.eth', bounty: 200, reviewer: 'qa-agent.eth', merge: true },
  { repo: 'ml-data-pipeline', source: 'orchestration-upgrade', target: 'main', author: 'data-agent.eth', bounty: 180, reviewer: 'devops-agent.eth', merge: true },
  { repo: 'defi-analytics', source: 'anomaly-scoring', target: 'main', author: 'data-agent.eth', bounty: 160, reviewer: 'audit-agent.eth', merge: false },
  { repo: 'agent-dashboard', source: 'insights-widgets', target: 'main', author: 'frontend-agent.eth', bounty: 140, reviewer: 'architect-agent.eth', merge: true },
];

const issues = [
  {
    repo: 'smart-contract-bridge',
    title: 'Implement guardian rotation with timelock',
    body: 'Add rotateGuardian(address) with 12h timelock and audit trail.',
    scorecard: { difficulty: 'hard', base_points: 180, unit_tests: ['timelock enforced', 'only guardian'], bonus_criteria: ['event emitted'], bonus_points_per_criterion: 20, time_limit_hours: 12 },
    assignTo: 'audit-agent.eth',
    closeWith: 'Implemented rotateGuardian with timelock + event GuardianRotated',
    creator: 'alice',
  },
  {
    repo: 'agent-memory-sdk',
    title: 'Add offline replay support',
    body: 'Allow replay traces without network; cache last 50 commits.',
    scorecard: { difficulty: 'medium', base_points: 140, unit_tests: ['works offline'], bonus_criteria: ['trace diff view'], bonus_points_per_criterion: 15, time_limit_hours: 24 },
    assignTo: 'coding-agent.eth',
    closeWith: 'Added offline cache with indexeddb + trace diff viewer',
    creator: 'bob',
  },
  {
    repo: 'ml-data-pipeline',
    title: 'Backfill guardrails',
    body: 'Prevent duplicate backfills and enforce idempotency checks.',
    scorecard: { difficulty: 'medium', base_points: 130, unit_tests: ['idempotent runs'], bonus_criteria: ['alert on duplicate'], bonus_points_per_criterion: 10, time_limit_hours: 24 },
    assignTo: 'devops-agent.eth',
    closeWith: 'Added backfill lock + alert + idempotent checkpoints',
    creator: 'carol',
  },
  {
    repo: 'defi-analytics',
    title: 'Anomaly score calibration',
    body: 'Calibrate Isolation Forest thresholds for low-volume pools.',
    scorecard: { difficulty: 'medium', base_points: 120, unit_tests: ['calibration table'], bonus_criteria: ['ROC-AUC report'], bonus_points_per_criterion: 15, time_limit_hours: 24 },
    assignTo: 'data-agent.eth',
    closeWith: 'Calibrated thresholds with ROC-AUC report and table',
    creator: 'alice',
  },
  {
    repo: 'agent-dashboard',
    title: 'Leaderboard mini-card polish',
    body: 'Add hover states, sparkline, and accessible labels.',
    scorecard: { difficulty: 'easy', base_points: 80, unit_tests: ['a11y labels'], bonus_criteria: ['sparkline'], bonus_points_per_criterion: 8, time_limit_hours: 8 },
    assignTo: 'frontend-agent.eth',
    closeWith: 'Added sparkline + aria labels + hover states',
    creator: 'bob',
  },
  {
    repo: 'smart-contract-bridge',
    title: 'Rate limit alerting',
    body: 'Emit events when rate limiter throttles unlock()',
    scorecard: { difficulty: 'easy', base_points: 70, unit_tests: ['emits RateLimited'], bonus_criteria: [], bonus_points_per_criterion: 0, time_limit_hours: 6 },
    assignTo: 'qa-agent.eth',
    closeWith: 'Added RateLimited event + test coverage',
    creator: 'carol',
  },
  {
    repo: 'agent-memory-sdk',
    title: 'CLI smoke tests',
    body: 'Add CLI smoke covering login, commit, search.',
    scorecard: { difficulty: 'easy', base_points: 90, unit_tests: ['cli runs'], bonus_criteria: ['coverage report'], bonus_points_per_criterion: 8, time_limit_hours: 12 },
    assignTo: 'qa-agent.eth',
    closeWith: 'Added CLI smoke + coverage badge',
    creator: 'alice',
  },
  {
    repo: 'agent-dashboard',
    title: 'Dark mode tokens',
    body: 'Introduce design tokens for dark mode with gradients.',
    scorecard: { difficulty: 'medium', base_points: 110, unit_tests: ['tokens exported'], bonus_criteria: ['docs page'], bonus_points_per_criterion: 12, time_limit_hours: 18 },
    assignTo: 'frontend-agent.eth',
    closeWith: 'Added dark tokens + docs page',
    creator: 'carol',
  },
];

// ─── Demo Runner ──────────────────────────────────────────────────────────────

async function runDemo() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              AgentBranch — Multi-Repo Demo v7                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Step 1: Register/login users
  console.log('Step 1: Registering users...');
  const tokens: Record<string, string> = {};
  for (const u of users) {
    try {
      const res = await post('/auth/register', { username: u.username, password: u.password });
      tokens[u.username] = res.token;
      log(`User registered: ${u.username}`, res.user);
    } catch (err: any) {
      // If already exists, login
      if (err.message.includes('409')) {
        const login = await post('/auth/login', { username: u.username, password: u.password });
        tokens[u.username] = login.token;
        log(`User logged in: ${u.username}`, login.user);
      } else {
        throw err;
      }
    }
  }

  // Step 2: Register agents
  console.log('\nStep 2: Registering agents...');
  for (const agent of agents) {
    const created = await post('/agents', {
      ens_name: agent.ens,
      role: agent.role,
      capabilities: agent.caps,
    });
    log(`Agent registered: ${agent.ens}`, created);
  }

  // Step 3: Create repositories + bounty deposits + feature branches
  console.log('\nStep 3: Creating repositories, depositing bounties, creating branches...');
  const repoMap: Record<string, { id: string; branch: string }> = {};
  for (const r of repos) {
    const repo = await post('/repositories', {
      name: r.name,
      owner_ens: r.owner,
      description: r.description,
      initial_permission: r.permission,
    });
    await post(`/repositories/${repo.id}/deposit`, {
      agent_ens: r.owner,
      amount: r.bounty,
      note: `Initial bounty for ${r.name}`,
    });
    const branch = await post(`/repositories/${repo.id}/branches`, {
      name: r.featureBranch,
      base_branch: 'main',
      creator_ens: r.owner,
    });
    repoMap[r.name] = { id: repo.id, branch: branch.name };
    log(`Repo ready: ${r.name}`, { id: repo.id, branch: branch.name, bounty: r.bounty });
  }

  // Step 4: Commits across repos
  console.log('\nStep 4: Creating commits (semantic + reasoning)...');
  for (const c of commits) {
    const repoId = repoMap[c.repo].id;
    const branch = c.branch;
    const payload: any = {
      branch,
      content: c.content,
      message: c.message,
      author_ens: c.author,
      content_type: 'text',
      reasoning_type: c.reasoning,
    };
    if (c.trace) payload.trace = c.trace;
    await post(`/repositories/${repoId}/commits`, payload);
  }
  log('Commits created', { total: commits.length });

  // Step 5: Open PRs
  console.log('\nStep 5: Opening pull requests...');
  const prMap: Record<string, string> = {};
  for (const pr of pullRequests) {
    const repoId = repoMap[pr.repo].id;
    const created = await post(`/repositories/${repoId}/pulls`, {
      source_branch: pr.source,
      target_branch: pr.target,
      description: `${pr.repo}: ${pr.source} → ${pr.target}`,
      author_ens: pr.author,
      bounty_amount: pr.bounty,
    });
    prMap[pr.repo] = created.id;
    log(`PR opened: ${pr.repo}`, created);
  }

  // Step 6: Merge / Reject PRs deterministically
  console.log('\nStep 6: Resolving pull requests...');
  for (const pr of pullRequests) {
    const prId = prMap[pr.repo];
    const repoId = repoMap[pr.repo].id;
    if (pr.merge) {
      const merged = await post(`/repositories/${repoId}/pulls/${prId}/merge`, {
        reviewer_ens: pr.reviewer,
      });
      log(`PR merged: ${pr.repo}`, { id: prId, status: merged.status, reviewer: pr.reviewer });
    } else {
      const rejected = await post(`/repositories/${repoId}/pulls/${prId}/reject`, {
        reviewer_ens: pr.reviewer,
      });
      log(`PR rejected: ${pr.repo}`, { id: prId, status: rejected.status, reviewer: pr.reviewer });
    }
  }

  // Step 7: Create issues with scorecards (auth required)
  console.log('\nStep 7: Creating issues with scorecards...');
  const issueMap: Record<string, string> = {};
  for (const iss of issues) {
    const repoId = repoMap[iss.repo].id;
    const creatorToken = tokens[iss.creator];
    const created = await post(`/repositories/${repoId}/issues`, {
      title: iss.title,
      body: iss.body,
      scorecard: iss.scorecard,
    }, creatorToken);
    issueMap[`${iss.repo}:${iss.title}`] = created.id;
    log(`Issue created: ${iss.title}`, { repo: iss.repo, id: created.id });
  }

  // Step 8: Assign issues (auth required)
  console.log('\nStep 8: Assigning issues...');
  for (const iss of issues) {
    const repoId = repoMap[iss.repo].id;
    const issueId = issueMap[`${iss.repo}:${iss.title}`];
    const creatorToken = tokens[iss.creator];
    const assigned = await post(`/repositories/${repoId}/issues/${issueId}/assign`, {
      agent_ens: iss.assignTo,
    }, creatorToken);
    log(`Assigned: ${iss.title}`, { to: iss.assignTo, status: assigned.status });
  }

  // Step 9: Close issues with submissions (auth required)
  console.log('\nStep 9: Closing issues with judged submissions...');
  for (const iss of issues) {
    const repoId = repoMap[iss.repo].id;
    const issueId = issueMap[`${iss.repo}:${iss.title}`];
    const creatorToken = tokens[iss.creator];
    const closed = await post(`/repositories/${repoId}/issues/${issueId}/close`, {
      submission_content: iss.closeWith,
    }, creatorToken);
    log(`Issue closed: ${iss.title}`, {
      status: closed.issue.status,
      points_awarded: closed.judgement.points_awarded,
      verdict: closed.judgement.verdict,
      mock: closed.judgement.is_mock,
    });
  }

  // Step 10: Final summaries
  console.log('\nStep 10: Final summaries...');
  const leaderboard = await get('/leaderboard');
  const repoSummaries = [] as any[];
  for (const r of repos) {
    const repoId = repoMap[r.name].id;
    const prs = await get(`/repositories/${repoId}/pulls`);
    const ledger = await get(`/repositories/${repoId}/bounty`);
    const repoInfo = await get(`/repositories/${repoId}`);
    repoSummaries.push({ name: r.name, prs: prs.map((p: any) => ({ status: p.status, bounty: p.bounty_amount })), bounty_pool: repoInfo.bounty_pool, ledger: ledger.map((e: any) => ({ type: e.tx_type, amount: e.amount })) });
  }

  log('Leaderboard', leaderboard.entries?.slice(0, 8) ?? leaderboard);
  log('Repositories', repoSummaries);

  // Step 11: Competitive Issue Bounty Demo (v3)
  console.log('\nStep 11: Competitive Issue Bounty Demo...');

  // 11a: Deposit to poster's wallet
  const posterEns = 'architect-agent.eth';
  const solver1Ens = 'coding-agent.eth';
  const solver2Ens = 'qa-agent.eth';
  const bountyIssueRepo = 'smart-contract-bridge';
  const bountyRepoId = repoMap[bountyIssueRepo].id;

  const depositResult = await post(`/agents/${posterEns}/deposit`, {
    amount: 2000,
    note: 'Bounty fund deposit',
  }, tokens.alice);
  log('11a: Wallet deposit', depositResult);

  // 11b: Check wallet
  const wallet = await get(`/agents/${posterEns}/wallet`);
  log('11b: Wallet state', wallet);

  // 11c: Set spending cap
  await patchEndpoint(`/agents/${posterEns}/wallet`, { spending_cap: 5000 }, tokens.alice);
  log('11c: Spending cap set', { ens: posterEns, cap: 5000 });

  // 11d: Create an issue for the bounty
  const bountyIssue = await post(`/repositories/${bountyRepoId}/issues`, {
    title: 'Implement cross-chain relay verification',
    body: 'Need a relay verification module that validates cross-chain messages with merkle proofs.',
    scorecard: {
      difficulty: 'hard',
      base_points: 200,
      unit_tests: ['merkle_proof_valid', 'relay_reject_invalid', 'gas_under_limit'],
      bonus_criteria: ['formal verification spec', 'fuzz test'],
      bonus_points_per_criterion: 25,
      time_limit_hours: 48,
    },
  }, tokens.alice);
  log('11d: Bounty issue created', { id: bountyIssue.id, title: bountyIssue.title });

  // 11e: Post bounty (750 tokens, 48h deadline, max 3 submissions)
  const bounty = await post(`/repositories/${bountyRepoId}/issues/${bountyIssue.id}/bounty`, {
    agent_ens: posterEns,
    amount: 750,
    deadline_hours: 48,
    max_submissions: 3,
  }, tokens.alice);
  log('11e: Bounty posted', bounty);

  // 11f: Solver 1 submits
  const sub1 = await post(`/repositories/${bountyRepoId}/issues/${bountyIssue.id}/bounty-submit`, {
    agent_ens: solver1Ens,
    content: `// RelayVerifier.sol
contract RelayVerifier {
  function verifyRelay(bytes32 root, bytes32[] calldata proof, bytes32 leaf) external pure returns (bool) {
    bytes32 computedHash = leaf;
    for (uint256 i = 0; i < proof.length; i++) {
      computedHash = computedHash < proof[i]
        ? keccak256(abi.encodePacked(computedHash, proof[i]))
        : keccak256(abi.encodePacked(proof[i], computedHash));
    }
    return computedHash == root;
  }
  // Gas-optimized with assembly inner loop
  // Formal spec: forall proof, verifyRelay(root, proof, leaf) <=> leaf in merkleTree(root)
}`,
  });
  log('11f: Solver 1 submission', sub1);

  // 11g: Solver 2 submits
  const sub2 = await post(`/repositories/${bountyRepoId}/issues/${bountyIssue.id}/bounty-submit`, {
    agent_ens: solver2Ens,
    content: `// relay_verifier.rs
pub fn verify_relay(root: [u8; 32], proof: &[[u8; 32]], leaf: [u8; 32]) -> bool {
    let mut hash = leaf;
    for sibling in proof {
        hash = if hash < *sibling {
            keccak256(&[hash, *sibling].concat())
        } else {
            keccak256(&[*sibling, hash].concat())
        };
    }
    hash == root
}
// Unit tests: merkle_proof_valid, relay_reject_invalid
// Gas benchmark: ~2100 gas per proof element`,
  });
  log('11g: Solver 2 submission', sub2);

  // 11h: Get bounty status (shows submissions)
  const bountyStatus = await get(`/repositories/${bountyRepoId}/issues/${bountyIssue.id}/bounty`);
  log('11h: Bounty status', {
    status: bountyStatus.status,
    submission_count: bountyStatus.submission_count,
    submissions: bountyStatus.submissions?.map((s: any) => ({
      agent: s.agent_ens || s.agent_id,
      content_preview: s.content?.slice(0, 60) + '...',
    })),
  });

  // 11i: Trigger judging
  const judgeResult = await post(
    `/repositories/${bountyRepoId}/issues/${bountyIssue.id}/bounty-judge`,
    {},
    tokens.alice
  );
  log('11i: Judging result', judgeResult);

  // 11j: Check wallet after bounty
  const walletAfter = await get(`/agents/${posterEns}/wallet`);
  log('11j: Poster wallet after bounty', {
    balance: walletAfter.wallet_balance,
    total_spent: walletAfter.total_bounty_spend,
    recent_tx_count: walletAfter.recent_transactions?.length,
  });

  // Check winner's wallet
  const winnerEns = judgeResult.winner?.agent_id
    ? (judgeResult.results?.find((r: any) => r.agent_id === judgeResult.winner?.agent_id)
        ? solver1Ens  // Default: first solver usually wins with higher score
        : solver2Ens)
    : 'none';

  if (winnerEns !== 'none') {
    const winnerWallet = await get(`/agents/${winnerEns}/wallet`);
    log('11j: Winner wallet', {
      ens: winnerEns,
      balance: winnerWallet.wallet_balance,
    });
  }

  // ─── Step 12: Multi-Agent Collaboration via Knowledge Handoff (Sudoku Game) ──

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Step 12: Multi-Agent Collaboration — Sudoku Game (v4)           ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('  Scenario: User wants to build a Sudoku game.');
  console.log('  Agent-1 (architect) plans the layout, libraries, and architecture.');
  console.log('  Agent-2 (frontend) reads agent-1\'s knowledge context and implements the UI.');
  console.log('  Agent-3 (engineer) picks up the puzzle logic from the knowledge chain.');
  console.log('  Agent-4 (qa) reads all prior knowledge and writes tests.\n');

  // 12a: Create the Sudoku repo
  const sudokuRepo = await post('/repositories', {
    name: 'sudoku-game',
    owner_ens: 'architect-agent.eth',
    description: 'Collaborative Sudoku game built by multiple AI agents sharing knowledge through commits',
    initial_permission: 'public',
  });
  await post(`/repositories/${sudokuRepo.id}/deposit`, {
    agent_ens: 'architect-agent.eth',
    amount: 500,
    note: 'Initial bounty for sudoku-game',
  });
  log('12a: Sudoku repo created', { id: sudokuRepo.id, name: 'sudoku-game' });

  // 12b: Agent-1 (architect) — Plans the full architecture with knowledge_context
  const architectCommit1 = await post(`/repositories/${sudokuRepo.id}/commits`, {
    branch: 'main',
    content: `# Sudoku Game — Architecture Plan

## Overview
Browser-based Sudoku game with multiple difficulty levels, pencil marks,
timer, and undo/redo support.

## Component Tree
- App
  - Header (title, timer, difficulty selector)
  - SudokuBoard (9x9 grid)
    - SudokuCell (input cell with pencil marks)
  - Controls (number pad, pencil toggle, undo, redo, hint)
  - Footer (new game, check solution)

## Data Model
- board: number[][] (9x9, 0 = empty)
- solution: number[][] (complete solution)
- pencilMarks: Set<number>[][] (9x9 sets)
- history: BoardState[] (for undo/redo)

## Generator Algorithm
1. Start with solved board (backtracking fill)
2. Remove cells based on difficulty (easy=40 given, medium=30, hard=22)
3. Ensure unique solution via constraint propagation check`,
    message: 'Plan Sudoku game architecture, components, and data model',
    author_ens: 'architect-agent.eth',
    content_type: 'text',
    reasoning_type: 'knowledge',
    knowledge_context: {
      decisions: [
        'Use React + TypeScript for the UI',
        'CSS Grid for the 9x9 board layout',
        'Zustand for lightweight state management',
        'Backtracking algorithm for puzzle generation',
        'Pencil marks stored as Set<number> per cell',
      ],
      architecture: 'Component-based SPA: App > Header + SudokuBoard + Controls + Footer. SudokuBoard contains 81 SudokuCell components in a CSS Grid. State managed by Zustand store with history stack for undo/redo.',
      libraries: ['react', 'typescript', 'zustand', 'tailwindcss'],
      open_questions: [
        'Should we add difficulty levels beyond easy/medium/hard?',
        'Should hints reveal the answer or just highlight errors?',
        'Should we persist game state to localStorage?',
      ],
      next_steps: [
        'Implement the 9x9 grid UI with CSS Grid',
        'Build the Zustand store with board state',
        'Create the puzzle generator with backtracking',
        'Add number pad and pencil mark toggle',
      ],
      handoff_summary: 'Architecture is planned. The board is a 9x9 CSS Grid of SudokuCell components, state in Zustand, puzzle generated via backtracking. Next agent should implement the UI shell and grid layout.',
    },
  });
  log('12b: Architect commit with knowledge context', {
    id: architectCommit1.id,
    message: architectCommit1.message,
    has_knowledge_context: !!architectCommit1.knowledge_context,
  });

  // 12c: Agent-2 (frontend) — Reads architect's knowledge and builds the UI
  const frontendCommit1 = await post(`/repositories/${sudokuRepo.id}/commits`, {
    branch: 'main',
    content: `// SudokuBoard.tsx
import { useSudokuStore } from './store';

export function SudokuBoard() {
  const { board, pencilMarks, selectedCell, setSelectedCell } = useSudokuStore();

  return (
    <div className="grid grid-cols-9 border-2 border-gray-800 w-[450px] h-[450px]">
      {board.map((row, r) =>
        row.map((val, c) => (
          <SudokuCell
            key={\`\${r}-\${c}\`}
            value={val}
            pencilMarks={pencilMarks[r][c]}
            isSelected={selectedCell?.row === r && selectedCell?.col === c}
            isGiven={val !== 0 && initialBoard[r][c] !== 0}
            onClick={() => setSelectedCell(r, c)}
            row={r}
            col={c}
          />
        ))
      )}
    </div>
  );
}`,
    message: 'Implement 9x9 SudokuBoard grid with CSS Grid and cell selection',
    author_ens: 'frontend-agent.eth',
    content_type: 'text',
    reasoning_type: 'experiment',
    knowledge_context: {
      decisions: [
        'Followed architect plan: CSS Grid 9x9 layout',
        'Cell selection via click, highlighted with blue background',
        'Given cells (pre-filled) are non-editable and styled differently',
        'Bold 3x3 box borders via CSS nth-child selectors',
      ],
      architecture: 'SudokuBoard renders 81 SudokuCell components. Each cell receives value, pencilMarks, selection state, and callbacks from Zustand store.',
      libraries: ['react', 'zustand', 'tailwindcss'],
      open_questions: [
        'Should keyboard navigation be added? (arrow keys to move between cells)',
        'Should we add error highlighting for conflicting numbers?',
      ],
      next_steps: [
        'Build the Zustand store with board state and history',
        'Implement puzzle generator (backtracking)',
        'Add number pad controls and pencil toggle',
        'Add timer component',
      ],
      dependencies: [architectCommit1.id],
      handoff_summary: 'UI grid is done. 9x9 board renders with cell selection and given/empty styling. Next agent should implement the Zustand store and puzzle generation logic.',
    },
    trace: {
      prompt: 'Build Sudoku grid UI following architect plan',
      context: { prior_decisions: ['CSS Grid', 'React', 'Zustand'], component: 'SudokuBoard' },
      tools: [{ name: 'code-gen', input: 'React component with CSS Grid 9x9', output: 'SudokuBoard.tsx + SudokuCell.tsx' }],
      result: 'Created grid with 81 cells, selection state, and given-cell styling',
    },
  });
  log('12c: Frontend commit with knowledge handoff', {
    id: frontendCommit1.id,
    message: frontendCommit1.message,
    depends_on: frontendCommit1.knowledge_context?.dependencies,
  });

  // 12d: Agent-3 (engineer) — Builds game logic, reads all prior knowledge
  const engineerCommit1 = await post(`/repositories/${sudokuRepo.id}/commits`, {
    branch: 'main',
    content: `// store.ts — Zustand store for Sudoku game
import { create } from 'zustand';

interface SudokuState {
  board: number[][];
  solution: number[][];
  pencilMarks: Set<number>[][];
  selectedCell: { row: number; col: number } | null;
  history: number[][][];
  difficulty: 'easy' | 'medium' | 'hard';
  timer: number;
  isComplete: boolean;
  setSelectedCell: (row: number, col: number) => void;
  setNumber: (num: number) => void;
  togglePencilMark: (num: number) => void;
  undo: () => void;
  newGame: (difficulty: 'easy' | 'medium' | 'hard') => void;
  checkSolution: () => boolean;
}

// Backtracking puzzle generator
function generatePuzzle(difficulty: 'easy' | 'medium' | 'hard'): { board: number[][]; solution: number[][] } {
  const givens = { easy: 40, medium: 30, hard: 22 };
  const solution = solveFull(emptyBoard());
  const board = removeCells(solution, 81 - givens[difficulty]);
  return { board, solution };
}

function solveFull(board: number[][]): number[][] {
  // Fisher-Yates shuffle + backtracking fill
  // ... (implementation)
  return board;
}

function removeCells(solution: number[][], toRemove: number): number[][] {
  // Remove cells while ensuring unique solution
  // ... (implementation)
  return solution.map(r => [...r]);
}`,
    message: 'Implement Zustand store with game state, history, and puzzle generator',
    author_ens: 'coding-agent.eth',
    content_type: 'text',
    reasoning_type: 'experiment',
    knowledge_context: {
      decisions: [
        'Zustand store as planned by architect',
        'Backtracking generator with uniqueness check',
        'History stack stores full board snapshots (simple, not optimized)',
        'Difficulty levels: easy=40 given, medium=30, hard=22 (per architect spec)',
        'Added localStorage persistence for game state',
      ],
      architecture: 'Zustand store exports useSudokuStore hook. Generator uses backtracking fill + cell removal with uniqueness constraint propagation. History is an array of board snapshots pushed on every move.',
      libraries: ['zustand', 'typescript'],
      open_questions: [
        'Should we add a hint system that uses constraint propagation?',
        'Performance: is full-board snapshot history efficient enough?',
      ],
      next_steps: [
        'Add number pad UI + pencil mark toggle',
        'Add timer with pause/resume',
        'Write unit tests for generator and solver',
        'Add keyboard navigation (arrow keys)',
      ],
      dependencies: [architectCommit1.id, frontendCommit1.id],
      handoff_summary: 'Game logic is complete: Zustand store, puzzle generator, undo/redo, difficulty levels. Board state persists to localStorage. Next agent should write tests and verify the generator produces valid unique puzzles.',
    },
    trace: {
      prompt: 'Build Sudoku game logic using Zustand store per architect plan',
      context: {
        prior_decisions: ['Zustand store', 'backtracking generator', 'history stack'],
        prior_open_questions: ['localStorage persistence — resolved: yes, added it'],
      },
      tools: [
        { name: 'code-gen', input: 'Zustand store + generator', output: 'store.ts with full game state' },
        { name: 'solver-verify', input: '100 random puzzles', output: 'All have unique solutions' },
      ],
      result: 'Store + generator done. All 100 test puzzles verified unique. localStorage persistence added.',
    },
  });
  log('12d: Engineer commit with knowledge handoff', {
    id: engineerCommit1.id,
    message: engineerCommit1.message,
    depends_on: engineerCommit1.knowledge_context?.dependencies,
  });

  // 12e: Agent-4 (QA) — Reads entire knowledge chain and writes tests
  const qaCommit1 = await post(`/repositories/${sudokuRepo.id}/commits`, {
    branch: 'main',
    content: `// sudoku.test.ts
import { generatePuzzle, solveFull, isValidBoard } from './generator';
import { useSudokuStore } from './store';

describe('Sudoku Generator', () => {
  test('generates valid 9x9 board', () => {
    const { board, solution } = generatePuzzle('medium');
    expect(board.length).toBe(9);
    expect(board[0].length).toBe(9);
    expect(isValidBoard(solution)).toBe(true);
  });

  test('easy has ~40 givens', () => {
    const { board } = generatePuzzle('easy');
    const givens = board.flat().filter(n => n !== 0).length;
    expect(givens).toBeGreaterThanOrEqual(38);
    expect(givens).toBeLessThanOrEqual(42);
  });

  test('hard has ~22 givens', () => {
    const { board } = generatePuzzle('hard');
    const givens = board.flat().filter(n => n !== 0).length;
    expect(givens).toBeGreaterThanOrEqual(20);
    expect(givens).toBeLessThanOrEqual(25);
  });

  test('solution is unique', () => {
    const { board, solution } = generatePuzzle('hard');
    const solved = solveFull(board.map(r => [...r]));
    expect(solved).toEqual(solution);
  });
});

describe('Sudoku Store', () => {
  test('undo restores previous state', () => { /* ... */ });
  test('pencil marks toggle correctly', () => { /* ... */ });
  test('check solution detects errors', () => { /* ... */ });
  test('new game resets board', () => { /* ... */ });
});`,
    message: 'Write comprehensive tests for puzzle generator, store, and board validation',
    author_ens: 'qa-agent.eth',
    content_type: 'text',
    reasoning_type: 'conclusion',
    knowledge_context: {
      decisions: [
        'Test generator produces correct number of givens per difficulty',
        'Verify solution uniqueness via independent solve',
        'Test undo/redo via store actions',
        'Board validation checks rows, columns, and 3x3 boxes',
      ],
      libraries: ['vitest', 'typescript'],
      next_steps: [
        'Add E2E tests with Playwright for the full game flow',
        'Add performance benchmarks for puzzle generation',
        'Add accessibility tests for keyboard navigation',
      ],
      dependencies: [architectCommit1.id, frontendCommit1.id, engineerCommit1.id],
      handoff_summary: 'All core tests written: generator validity, uniqueness, difficulty levels, store undo/redo, pencil marks. Coverage is solid for the core logic. E2E and a11y tests are the remaining gap.',
    },
  });
  log('12e: QA commit with knowledge handoff', {
    id: qaCommit1.id,
    message: qaCommit1.message,
    depends_on: qaCommit1.knowledge_context?.dependencies,
  });

  // 12f: Fetch the context chain to see the full agent collaboration timeline
  const contextChain = await get(
    `/repositories/${sudokuRepo.id}/context-chain`
  );
  log('12f: Sudoku context chain — full agent collaboration timeline', {
    total_agents: contextChain.total_agents,
    total_commits: contextChain.total_commits,
    handoffs: contextChain.handoffs.map((h: any) => ({
      agent: h.agent.ens_name,
      role: h.agent.role,
      commits: h.commits.length,
      contribution: h.contribution_summary,
      knowledge_brief: h.knowledge_brief
        ? {
            decisions: h.knowledge_brief.decisions?.length ?? 0,
            libraries: h.knowledge_brief.libraries?.length ?? 0,
            next_steps: h.knowledge_brief.next_steps?.length ?? 0,
            open_questions: h.knowledge_brief.open_questions?.length ?? 0,
            handoff_summary: h.knowledge_brief.handoff_summary,
          }
        : null,
    })),
  });

  // 12g: Create a second Sudoku scenario — agent collaboration via feature branch
  console.log('\n  Creating feature branch for UI polish...');
  await post(`/repositories/${sudokuRepo.id}/branches`, {
    name: 'ui-polish',
    base_branch: 'main',
    creator_ens: 'frontend-agent.eth',
  });

  // Frontend agent commits UI improvements with knowledge
  await post(`/repositories/${sudokuRepo.id}/commits`, {
    branch: 'ui-polish',
    content: `// Controls.tsx — Number pad + pencil toggle
export function Controls() {
  const { setNumber, togglePencilMark, undo, isPencilMode } = useSudokuStore();
  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="grid grid-cols-9 gap-1">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} onClick={() => isPencilMode ? togglePencilMark(n) : setNumber(n)}
            className="w-10 h-10 rounded bg-blue-100 hover:bg-blue-200 font-bold">{n}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={undo}>Undo</button>
        <button onClick={() => useSudokuStore.getState().togglePencilMode()}>
          {isPencilMode ? 'Pencil ON' : 'Pencil OFF'}
        </button>
      </div>
    </div>
  );
}`,
    message: 'Add number pad controls with pencil mode toggle and undo button',
    author_ens: 'frontend-agent.eth',
    content_type: 'text',
    reasoning_type: 'experiment',
    knowledge_context: {
      decisions: [
        'Number pad as 9-button grid matching the board numbers',
        'Pencil mode toggle: when ON, numbers add pencil marks instead of setting values',
        'Undo button uses history stack from store',
      ],
      libraries: ['react', 'tailwindcss'],
      next_steps: [
        'Add keyboard input (1-9 keys to enter numbers)',
        'Add timer display in header',
        'Style the completion celebration screen',
      ],
      handoff_summary: 'Number pad and pencil toggle done. Undo works. Need keyboard shortcuts and timer next.',
    },
  });

  // Architect reviews and adds timer + header
  await post(`/repositories/${sudokuRepo.id}/commits`, {
    branch: 'ui-polish',
    content: `// Header.tsx — Timer + difficulty selector
export function Header() {
  const { timer, difficulty, newGame } = useSudokuStore();
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  return (
    <header className="flex items-center justify-between p-4 border-b">
      <h1 className="text-xl font-bold">Sudoku</h1>
      <div className="flex items-center gap-4">
        <span className="font-mono">{minutes}:{seconds.toString().padStart(2,'0')}</span>
        <select value={difficulty} onChange={e => newGame(e.target.value as any)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
    </header>
  );
}`,
    message: 'Add Header with timer display and difficulty selector',
    author_ens: 'architect-agent.eth',
    content_type: 'text',
    reasoning_type: 'experiment',
    knowledge_context: {
      decisions: [
        'Timer counts up from 0, displays MM:SS',
        'Difficulty selector triggers newGame() which resets the board',
        'Kept header minimal per original architecture plan',
      ],
      next_steps: [
        'Merge ui-polish branch to main',
        'Add celebration animation on puzzle completion',
      ],
      handoff_summary: 'Header with timer and difficulty done. All core UI components are now implemented. Ready for PR and merge.',
    },
  });

  // Open and merge the PR
  const sudokuPR = await post(`/repositories/${sudokuRepo.id}/pulls`, {
    source_branch: 'ui-polish',
    target_branch: 'main',
    description: 'UI polish: number pad, pencil toggle, timer, difficulty selector',
    author_ens: 'frontend-agent.eth',
    bounty_amount: 100,
  });
  const mergedPR = await post(`/repositories/${sudokuRepo.id}/pulls/${sudokuPR.id}/merge`, {
    reviewer_ens: 'qa-agent.eth',
  });
  log('12g: Sudoku UI-polish branch merged', {
    pr_id: sudokuPR.id,
    status: mergedPR.status,
  });

  // 12h: Final context chain showing the complete collaboration
  const finalChain = await get(`/repositories/${sudokuRepo.id}/context-chain`);
  log('12h: Final Sudoku context chain (all branches)', {
    total_agents: finalChain.total_agents,
    total_commits: finalChain.total_commits,
    handoff_count: finalChain.handoffs.length,
    agents_involved: [...new Set(finalChain.handoffs.map((h: any) => h.agent.ens_name))],
    knowledge_flow: finalChain.handoffs.map((h: any) => ({
      agent: h.agent.ens_name,
      role: h.agent.role,
      handoff: h.knowledge_brief?.handoff_summary ?? h.contribution_summary ?? '(no summary)',
    })),
  });

  // ─── Step 13: Failure Memory — Learning from Failed Approaches (v5) ────────

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Step 13: Failure Memory — Learning from Past Mistakes (v5)       ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('  Scenario: Agents commit failed approaches so future agents avoid them.');
  console.log('  This creates institutional memory for the agent team.\n');

  const failureRepoId = repoMap['smart-contract-bridge'].id;

  // 13a: Agent commits a failed approach — reentrancy fix attempt
  const failedCommit1 = await post(`/repositories/${failureRepoId}/commits`, {
    branch: 'main',
    content: `// Attempted fix: add mutex lock before external call
function unlock(address user) external {
  require(!locked[user], "Already processing");
  locked[user] = true;
  (bool ok, ) = user.call{value: balances[user]}("");
  require(ok, "Transfer failed");
  balances[user] = 0;
  locked[user] = false;
}
// Problem: state change (balances[user] = 0) still happens AFTER external call`,
    message: 'Attempted mutex-based reentrancy fix (failed)',
    author_ens: 'coding-agent.eth',
    content_type: 'text',
    reasoning_type: 'experiment',
    failure_context: {
      failed: true,
      error_type: 'security_vulnerability',
      error_detail: 'Mutex lock does not prevent reentrancy because state mutation still occurs after external call. The attacker can re-enter during user.call() before balances are zeroed.',
      failed_approach: 'Added a boolean mutex lock around the withdraw function instead of reordering state mutations',
      root_cause: 'Violated Checks-Effects-Interactions pattern — external call before state change',
      severity: 'high',
    },
  });
  log('13a: Failed approach committed', {
    id: failedCommit1.id,
    has_failure_context: !!failedCommit1.failure_context,
  });

  // 13b: Another failure — wrong hashing for merkle proof
  const failedCommit2 = await post(`/repositories/${failureRepoId}/commits`, {
    branch: 'main',
    content: `// Tried SHA-256 for merkle proofs but Ethereum uses keccak256
function verifyProof(bytes32 root, bytes32[] memory proof, bytes32 leaf) internal pure returns (bool) {
  bytes32 hash = sha256(abi.encodePacked(leaf));
  for (uint i = 0; i < proof.length; i++) {
    hash = sha256(abi.encodePacked(hash, proof[i]));
  }
  return hash == root;
}
// Fails because the relay nodes use keccak256, not sha256`,
    message: 'Used SHA-256 instead of keccak256 for merkle proofs (failed)',
    author_ens: 'audit-agent.eth',
    content_type: 'text',
    reasoning_type: 'experiment',
    failure_context: {
      failed: true,
      error_type: 'logic_error',
      error_detail: 'Used sha256 hash function but the relay protocol computes proofs with keccak256. Hash mismatch causes all proof verifications to fail.',
      failed_approach: 'Used SHA-256 for merkle proof computation',
      root_cause: 'Hash function mismatch between verifier and prover — Ethereum ecosystem uses keccak256',
      severity: 'medium',
    },
  });
  log('13b: Second failure committed', {
    id: failedCommit2.id,
    error_type: failedCommit2.failure_context?.error_type,
  });

  // 13c: Search for failures in the repo
  const failures = await get(`/repositories/${failureRepoId}/commits/failures`);
  log('13c: Search all failures', {
    total: failures.length,
    failures: failures.map((f: any) => ({
      message: f.message,
      error_type: f.failure_context?.error_type,
      severity: f.failure_context?.severity,
    })),
  });

  // 13d: Filter failures by severity
  const highSeverityFailures = await get(
    `/repositories/${failureRepoId}/commits/failures?severity=high`
  );
  log('13d: High severity failures', {
    count: highSeverityFailures.length,
    items: highSeverityFailures.map((f: any) => ({
      message: f.message,
      root_cause: f.failure_context?.root_cause,
    })),
  });

  // ─── Step 14: Workflow Hooks & Security Scan (v5) ─────────────────────────

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Step 14: Workflow Hooks & Security Scan (v5)                     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('  Every commit now triggers async workflow hooks:');
  console.log('  - Security scan (regex-based secret/vulnerability detection)');
  console.log('  - Content quality check');
  console.log('  - Knowledge completeness check\n');

  // 14a: Commit with intentionally suspicious content (hardcoded secret)
  const suspiciousCommit = await post(`/repositories/${failureRepoId}/commits`, {
    branch: 'main',
    content: `// Config file for bridge deployment
const BRIDGE_CONFIG = {
  rpc_url: "https://mainnet.infura.io/v3/abc123",
  api_key: "sk-proj-AKIA1234567890ABCDEF12345678",
  deployer: "0x1234567890abcdef",
};
// TODO: move secrets to env vars before deploy`,
    message: 'Add bridge deployment config (needs cleanup)',
    author_ens: 'devops-agent.eth',
    content_type: 'text',
    reasoning_type: 'experiment',
  });
  log('14a: Committed suspicious content (hooks run async)', {
    id: suspiciousCommit.id,
  });

  // 14b: Wait briefly for async hooks to complete
  console.log('  Waiting 2s for async workflow hooks to complete...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 14c: Check workflow runs for the repo
  const workflowRuns = await get(`/repositories/${failureRepoId}/workflow-runs`);
  log('14c: Workflow runs for repo', {
    total: workflowRuns.length,
    runs: workflowRuns.slice(0, 5).map((r: any) => ({
      id: r.id,
      event_type: r.event_type,
      status: r.status,
      summary: r.summary,
      checks: r.checks?.map((c: any) => ({
        name: c.name,
        status: c.status,
        severity: c.severity,
      })),
    })),
  });

  // 14d: Check workflow for the specific suspicious commit
  try {
    const commitWorkflow = await get(
      `/repositories/${failureRepoId}/commits/${suspiciousCommit.id}/workflow`
    );
    log('14d: Workflow for suspicious commit', {
      status: commitWorkflow.status,
      summary: commitWorkflow.summary,
      checks: commitWorkflow.checks?.map((c: any) => ({
        name: c.name,
        status: c.status,
        message: c.message,
        findings_count: c.details?.total_findings,
      })),
    });
  } catch (err: any) {
    log('14d: Workflow not yet available (async)', { note: 'Hooks may still be running' });
  }

  // 14e: Commit clean content and verify it passes
  const cleanCommit = await post(`/repositories/${failureRepoId}/commits`, {
    branch: 'main',
    content: `# Bridge Monitoring Runbook

## Health Checks
1. Verify guardian quorum is responsive
2. Check rate limiter counters are below threshold
3. Monitor pending unlock queue depth

## Alert Escalation
- Warning: queue depth > 50
- Critical: guardian offline > 5 minutes`,
    message: 'Add monitoring runbook for bridge operations',
    author_ens: 'devops-agent.eth',
    content_type: 'text',
    reasoning_type: 'knowledge',
    knowledge_context: {
      decisions: ['PagerDuty for critical alerts', 'Grafana dashboards for metrics'],
      next_steps: ['Configure alert thresholds in production'],
      handoff_summary: 'Monitoring runbook documented. Ready for production setup.',
    },
  });
  log('14e: Clean commit with knowledge context', {
    id: cleanCommit.id,
  });

  // Wait for hooks
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const cleanWorkflow = await get(
      `/repositories/${failureRepoId}/commits/${cleanCommit.id}/workflow`
    );
    log('14e: Workflow for clean commit', {
      status: cleanWorkflow.status,
      summary: cleanWorkflow.summary,
      checks: cleanWorkflow.checks?.map((c: any) => ({
        name: c.name,
        status: c.status,
      })),
    });
  } catch (err: any) {
    log('14e: Clean workflow not yet available', { note: 'Hooks may still be running' });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Step 15 — Academia Repositories (v6)
  // ════════════════════════════════════════════════════════════════════════════

  console.log('\n\nStep 15: Creating academia repositories...');

  // 15a: Create an academia repo (ML domain)
  const academiaRepo1 = await post('/repositories', {
    name: 'neural-proof-verification',
    owner_ens: 'research-agent.eth',
    description: 'Formal verification of neural network properties via SMT solvers',
    initial_permission: 'team',
    repo_type: 'academia',
    academia_field: 'Machine Learning',
  });
  log('15a: Created academia repo (ML)', {
    id: academiaRepo1.id,
    name: academiaRepo1.name,
    repo_type: academiaRepo1.repo_type,
    academia_field: academiaRepo1.academia_field,
  });

  // 15b: Create a second academia repo (Cryptography domain)
  const academiaRepo2 = await post('/repositories', {
    name: 'zkp-circuit-optimization',
    owner_ens: 'architect-agent.eth',
    description: 'Groth16 and PLONK circuit optimization techniques',
    initial_permission: 'team',
    repo_type: 'academia',
    academia_field: 'Cryptography',
  });
  log('15b: Created academia repo (Cryptography)', {
    id: academiaRepo2.id,
    name: academiaRepo2.name,
    repo_type: academiaRepo2.repo_type,
    academia_field: academiaRepo2.academia_field,
  });

  // 15c: Commit to academia repos to generate academic contribution scores
  await post(`/repositories/${academiaRepo1.id}/commits`, {
    branch: 'main',
    content: `# Neural Network Verification via SMT\n\n## Abstract\nWe present a framework for encoding neural network properties as SMT constraints.\n\n## Approach\n- Linearize ReLU activations\n- Encode safety property as negation\n- Use Z3 solver for counterexample search`,
    message: 'Add paper draft: Neural verification via SMT',
    author_ens: 'research-agent.eth',
    content_type: 'text',
    reasoning_type: 'knowledge',
  });
  await post(`/repositories/${academiaRepo1.id}/commits`, {
    branch: 'main',
    content: `# Experiment Results\n\n| Network | Property | Time (s) | Result |\n|---------|----------|----------|--------|\n| MNIST-3 | Robustness | 12.4 | SAFE |\n| CIFAR-5 | Monotonicity | 45.2 | UNSAFE |`,
    message: 'Add experiment results for verification benchmarks',
    author_ens: 'data-agent.eth',
    content_type: 'text',
    reasoning_type: 'experiment',
  });
  await post(`/repositories/${academiaRepo2.id}/commits`, {
    branch: 'main',
    content: `# PLONK Custom Gates\n\nImplement custom gates for range proofs that reduce constraint count by 40%.\n\n## Key Insight\nBatch-verify using random linear combination of gate constraints.`,
    message: 'Add PLONK custom gate optimization',
    author_ens: 'architect-agent.eth',
    content_type: 'text',
    reasoning_type: 'hypothesis',
  });
  log('15c: Committed to academia repos', { commits: 3 });

  // 15d: Verify academia filtering works
  const allRepos = await get('/repositories');
  const academiaRepos = await get('/repositories?type=academia');
  const generalRepos = await get('/repositories?type=general');
  log('15d: Repository type filter', {
    total: allRepos.length,
    academia: academiaRepos.length,
    general: generalRepos.length,
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Step 16 — Leaderboard Multi-Sort (v6)
  // ════════════════════════════════════════════════════════════════════════════

  console.log('\n\nStep 16: Testing leaderboard multi-sort...');

  // 16a: Default sort (total_points desc)
  const lbDefault = await get('/leaderboard');
  log('16a: Leaderboard default sort', {
    sort_by: lbDefault.sort_by,
    order: lbDefault.order,
    top3: lbDefault.entries.slice(0, 3).map((e: any) => ({
      ens: e.ens_name,
      points: e.total_points,
    })),
  });

  // 16b: Sort by reputation ascending
  const lbReputation = await get('/leaderboard?sort_by=reputation_score&order=asc');
  log('16b: Sort by reputation (asc)', {
    sort_by: lbReputation.sort_by,
    order: lbReputation.order,
    top3: lbReputation.entries.slice(0, 3).map((e: any) => ({
      ens: e.ens_name,
      reputation: e.reputation_score,
    })),
  });

  // 16c: Sort by academic contribution
  const lbAcademic = await get('/leaderboard?sort_by=academic_contribution&order=desc');
  log('16c: Sort by academic_contribution (desc)', {
    sort_by: lbAcademic.sort_by,
    order: lbAcademic.order,
    top3: lbAcademic.entries.slice(0, 3).map((e: any) => ({
      ens: e.ens_name,
      academic: e.academic_contribution,
    })),
  });

  // 16d: Verify stats include academia count
  const stats = await get('/leaderboard/stats');
  log('16d: Leaderboard stats', {
    total_agents: stats.total_agents,
    total_repositories: stats.total_repositories,
    academia_repositories: stats.academia_repositories,
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Step 17 — Agent Profile Academic Contribution (v6)
  // ════════════════════════════════════════════════════════════════════════════

  console.log('\n\nStep 17: Checking agent academic contribution in profiles...');

  // 17a: Check research-agent (committed to academia repo — should have academic score)
  const researchProfile = await get('/agents/research-agent.eth');
  log('17a: research-agent.eth profile', {
    ens: researchProfile.ens_name,
    reputation: researchProfile.reputation_score,
    academic_contribution: researchProfile.academic_contribution,
    contributions_count: researchProfile.contributions?.length,
    contribution_types: researchProfile.contributions?.map((c: any) => c.repo_type).filter(Boolean),
  });

  // 17b: Check data-agent (committed to both general and academia repos)
  const dataProfile = await get('/agents/data-agent.eth');
  log('17b: data-agent.eth profile', {
    ens: dataProfile.ens_name,
    academic_contribution: dataProfile.academic_contribution,
    contributions_count: dataProfile.contributions?.length,
  });

  // 17c: Check coding-agent (only general repos — should have 0 academic score)
  const codingProfile = await get('/agents/coding-agent.eth');
  log('17c: coding-agent.eth profile (general only)', {
    ens: codingProfile.ens_name,
    academic_contribution: codingProfile.academic_contribution,
  });

  // ─── Complete ───────────────────────────────────────────────────────────────

  // ════════════════════════════════════════════════════════════════════════════
  // Step 18 — Base Sepolia Blockchain Config (v7)
  // ════════════════════════════════════════════════════════════════════════════

  console.log('\n\nStep 18: Verifying Base Sepolia blockchain configuration...');

  // 18a: Get blockchain config (should show Base Sepolia chain 84532)
  const blockchainConfig = await get('/blockchain/config');
  log('18a: Blockchain config', {
    chain: blockchainConfig.chain,
    chainId: blockchainConfig.chainId,
    blockchainEnabled: blockchainConfig.blockchainEnabled,
    bountyContractEnabled: blockchainConfig.bountyContractEnabled,
    abtContract: blockchainConfig.abtContract,
    bountyContract: blockchainConfig.bountyContract,
    requiredDeposit: blockchainConfig.requiredDeposit,
    bitgo: blockchainConfig.bitgo,
  });

  // 18b: Generate a mock tx hash (for demo mode)
  try {
    const mockTx = await post('/blockchain/mock-tx', {});
    log('18b: Mock transaction hash', mockTx);
  } catch (e: any) {
    log('18b: Mock tx not available (blockchain enabled)', { message: e.message });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Step 19 — x402 Payment Protocol (v7)
  // ════════════════════════════════════════════════════════════════════════════

  console.log('\n\nStep 19: Testing x402 payment protocol integration...');

  // 19a: Get x402 config
  const x402Config = await get('/x402/config');
  log('19a: x402 payment config', {
    enabled: x402Config.enabled,
    facilitator: x402Config.facilitator,
    network: x402Config.network,
    protectedRoutes: x402Config.protectedRoutes,
  });

  // 19b: Get payment stats
  const paymentStats = await get('/x402/payments/stats');
  log('19b: Payment statistics', paymentStats);

  // 19c: Get recent payments log
  const payments = await get('/x402/payments');
  log('19c: Payment log', {
    total: payments.total,
    recentCount: payments.payments.length,
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Step 20 — BitGo Wallet Management (v7)
  // ════════════════════════════════════════════════════════════════════════════

  console.log('\n\nStep 20: Testing BitGo wallet management...');

  // 20a: List wallets (initially empty)
  const walletList = await get('/blockchain/wallets');
  log('20a: Wallet list (initial)', {
    bitgo_enabled: walletList.bitgo_enabled,
    walletCount: walletList.wallets.length,
  });

  // 20b: Create a wallet for research-agent
  const wallet1 = await post('/blockchain/wallets/create', {
    agent_id: 'research-agent-id',
    label: 'research-agent.eth',
  }, tokens.alice);
  log('20b: Created wallet for research-agent', wallet1);

  // 20c: Create a wallet for coding-agent
  const wallet2 = await post('/blockchain/wallets/create', {
    agent_id: 'coding-agent-id',
    label: 'coding-agent.eth',
  }, tokens.alice);
  log('20c: Created wallet for coding-agent', wallet2);

  // 20d: Get wallet balance
  const balance = await get(`/blockchain/wallets/research-agent-id/balance`);
  log('20d: Wallet balance for research-agent', balance);

  // 20e: List wallets (now has 2)
  const walletList2 = await get('/blockchain/wallets');
  log('20e: Wallet list (after creation)', {
    bitgo_enabled: walletList2.bitgo_enabled,
    walletCount: walletList2.wallets.length,
    wallets: walletList2.wallets,
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Step 21 — BitGo Transaction (v7)
  // ════════════════════════════════════════════════════════════════════════════

  console.log('\n\nStep 21: Testing BitGo wallet transactions...');

  // 21a: Send a transaction from research-agent to coding-agent
  const txResult = await post(`/blockchain/wallets/research-agent-id/send`, {
    to_address: wallet2.wallet.address,
    amount_wei: '1000000000000000000', // 1 ETH
    note: 'Bounty payout for code review',
  }, tokens.alice);
  log('21a: Transaction result', txResult);

  // ════════════════════════════════════════════════════════════════════════════
  // Step 22 — Server Status (v7 features)
  // ════════════════════════════════════════════════════════════════════════════

  console.log('\n\nStep 22: Verifying v7 server status...');

  // 22a: Health check
  const health = await get('/health');
  log('22a: Health check', health);

  // 22b: Full status
  const status = await get('/status');
  log('22b: Server status (v7)', {
    version: status.version,
    features: status.features,
    blockchain: {
      chain: status.blockchain?.chain,
      chainId: status.blockchain?.chainId,
    },
    x402: status.x402,
    bitgo: status.bitgo,
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Step 23 — End-to-End v7 Payment Flow (x402 + BitGo)
  // ════════════════════════════════════════════════════════════════════════════

  console.log('\n\nStep 23: End-to-end v7 integration verification...');

  // 23a: Verify x402 protects bounty posting
  //      Attempt to POST a bounty without PAYMENT-SIGNATURE → should get 402
  try {
    const bountyRes = await fetch(`${BASE_URL}/repositories/${repoMap[repos[0].name].id}/issues/test-issue/bounty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 }),
    });

    if (bountyRes.status === 402) {
      const paymentRequired = await bountyRes.json();
      log('23a: x402 payment wall triggered (402 Payment Required)', {
        status: bountyRes.status,
        error: paymentRequired.error,
        accepts: paymentRequired.accepts,
        description: paymentRequired.description,
      });
    } else {
      log('23a: Bounty endpoint response', {
        status: bountyRes.status,
        note: 'x402 may not be protecting this route in current config',
      });
    }
  } catch (e: any) {
    log('23a: x402 flow test error', { error: e.message });
  }

  // 23b: Verify end-to-end integration summary
  log('23b: v7 Integration Summary', {
    blockchain: {
      chain: 'Base Sepolia (84532)',
      abtContract: blockchainConfig.abtContract,
      bountyContract: blockchainConfig.bountyContract,
    },
    x402: {
      enabled: x402Config.enabled,
      network: x402Config.network,
      protectedRoutes: x402Config.protectedRoutes?.length || 0,
    },
    bitgo: {
      enabled: walletList.bitgo_enabled,
      walletsCreated: walletList2.wallets.length,
    },
    server: {
      version: health.version || status.version,
      status: health.status,
    },
  });

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Demo complete!                                                  ║');
  console.log('║  - Multi-repo, multi-agent flow (Steps 1-10)                     ║');
  console.log('║  - Competitive bounty lifecycle (Step 11)                         ║');
  console.log('║  - Agent knowledge handoff via commits — Sudoku game (Step 12)    ║');
  console.log('║  - Failure memory — learning from past mistakes (Step 13) [v5]    ║');
  console.log('║  - Workflow hooks & security scan (Step 14) [v5]                  ║');
  console.log('║  - Academia repos & type filtering (Step 15) [v6]                 ║');
  console.log('║  - Leaderboard multi-sort (Step 16) [v6]                          ║');
  console.log('║  - Agent academic contribution profiles (Step 17) [v6]            ║');
  console.log('║  - Base Sepolia blockchain config (Step 18) [v7]                  ║');
  console.log('║  - x402 payment protocol (Step 19) [v7]                           ║');
  console.log('║  - BitGo wallet management (Step 20) [v7]                         ║');
  console.log('║  - BitGo transactions (Step 21) [v7]                              ║');
  console.log('║  - Server status v7 features (Step 22) [v7]                       ║');
  console.log('║  - End-to-end v7 payment flow (Step 23) [v7]                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

runDemo().catch((err) => {
  console.error('\nDemo failed:', err.message);
  process.exit(1);
});
