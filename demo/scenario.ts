/**
 * AgentBranch Demo Scenario v2
 *
 * Deterministic, multi-repo, multi-agent walkthrough that exercises:
 * - Auth (3 users)
 * - 8 agents across varied roles
 * - 5 repositories with bounty deposits
 * - 25+ commits with reasoning + traces
 * - Branching + PRs (merged and rejected)
 * - Issues with scorecards, assignment, judge verdicts
 * - Leaderboard + repo summaries
 *
 * Run against a live backend (API base from VITE_API_URL or http://localhost:3001):
 *   npm run demo
 */

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const BASE_URL = process.env.VITE_API_URL ?? 'http://localhost:3001';

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
  console.log('║              AgentBranch — Multi-Repo Demo v2                    ║');
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

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  Demo complete! Multi-repo, multi-agent flow + bounty executed.  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
}

runDemo().catch((err) => {
  console.error('\nDemo failed:', err.message);
  process.exit(1);
});
