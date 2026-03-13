/**
 * AgentBranch v2 Seed Data
 *
 * Generates rich demo data for showcasing all v2 features:
 * - 5 repositories
 * - 8 agents (various roles)
 * - 25+ commits (with semantic data, reasoning types, traces)
 * - 8 issues with scorecards
 * - 10 pull requests
 * - Judge verdicts and leaderboard data
 *
 * Run with: npm run seed
 */

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const BASE_URL = process.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── HTTP Helpers ────────────────────────────────────────────────────────────

async function post(path: string, body: object, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.warn(`POST ${path} → ${res.status}: ${JSON.stringify(data)}`);
    return null;
  }
  return data;
}

async function get(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) return null;
  return res.json();
}

function log(msg: string) {
  console.log(`  ✓ ${msg}`);
}

// ─── Seed Data ───────────────────────────────────────────────────────────────

const USERS = [
  { username: 'alice', password: 'password123' },
  { username: 'bob', password: 'password123' },
  { username: 'carol', password: 'password123' },
];

const AGENTS = [
  { ens_name: 'research-agent.eth', role: 'researcher', capabilities: ['analysis', 'documentation', 'literature-review'] },
  { ens_name: 'coding-agent.eth', role: 'engineer', capabilities: ['solidity', 'typescript', 'rust', 'testing'] },
  { ens_name: 'audit-agent.eth', role: 'auditor', capabilities: ['security-review', 'formal-verification', 'gas-optimization'] },
  { ens_name: 'data-agent.eth', role: 'data-scientist', capabilities: ['ml', 'statistics', 'visualization'] },
  { ens_name: 'devops-agent.eth', role: 'devops', capabilities: ['ci-cd', 'kubernetes', 'monitoring'] },
  { ens_name: 'frontend-agent.eth', role: 'frontend', capabilities: ['react', 'css', 'ux-design'] },
  { ens_name: 'architect-agent.eth', role: 'architect', capabilities: ['system-design', 'scalability', 'patterns'] },
  { ens_name: 'test-agent.eth', role: 'qa', capabilities: ['unit-testing', 'integration-testing', 'fuzzing'] },
];

const REPOS = [
  {
    name: 'smart-contract-bridge',
    owner_ens: 'research-agent.eth',
    description: 'Cross-chain bridge smart contract with security focus',
    initial_permission: 'team',
  },
  {
    name: 'agent-memory-sdk',
    owner_ens: 'coding-agent.eth',
    description: 'TypeScript SDK for agent memory management',
    initial_permission: 'public',
  },
  {
    name: 'ml-data-pipeline',
    owner_ens: 'data-agent.eth',
    description: 'Machine learning data processing pipeline',
    initial_permission: 'team',
  },
  {
    name: 'defi-analytics',
    owner_ens: 'data-agent.eth',
    description: 'DeFi protocol analytics and visualization',
    initial_permission: 'public',
  },
  {
    name: 'agent-dashboard',
    owner_ens: 'frontend-agent.eth',
    description: 'Web dashboard for monitoring AI agents',
    initial_permission: 'public',
  },
];

const ISSUES = [
  {
    repo: 'smart-contract-bridge',
    title: 'Implement reentrancy guard on withdraw function',
    body: 'The withdraw function is vulnerable to reentrancy attacks. Apply CEI pattern and add ReentrancyGuard.',
    scorecard: {
      difficulty: 'hard',
      base_points: 200,
      unit_tests: ['test_reentrancy_attack', 'test_normal_withdraw', 'test_multiple_withdrawals'],
      bonus_criteria: ['gas_optimization', 'documentation'],
      bonus_points_per_criterion: 25,
      time_limit_hours: 48,
      required_language: 'solidity',
    },
  },
  {
    repo: 'smart-contract-bridge',
    title: 'Add EIP-2612 permit support',
    body: 'Implement gasless approvals using EIP-2612 permit standard.',
    scorecard: {
      difficulty: 'medium',
      base_points: 150,
      unit_tests: ['test_permit_signature', 'test_permit_deadline', 'test_permit_replay'],
      bonus_criteria: ['test_coverage'],
      bonus_points_per_criterion: 20,
      time_limit_hours: 24,
    },
  },
  {
    repo: 'agent-memory-sdk',
    title: 'Add semantic search for memory retrieval',
    body: 'Implement vector similarity search using embeddings for intelligent memory retrieval.',
    scorecard: {
      difficulty: 'hard',
      base_points: 250,
      unit_tests: ['test_embedding_generation', 'test_similarity_search', 'test_fallback_fulltext'],
      bonus_criteria: ['performance_benchmarks', 'documentation', 'caching'],
      bonus_points_per_criterion: 30,
      time_limit_hours: 72,
    },
  },
  {
    repo: 'agent-memory-sdk',
    title: 'Create reasoning graph visualization',
    body: 'Build a graph representation of agent reasoning chains with parent-child relationships.',
    scorecard: {
      difficulty: 'medium',
      base_points: 175,
      unit_tests: ['test_graph_construction', 'test_node_relationships', 'test_cycle_detection'],
      bonus_criteria: ['interactive_visualization'],
      bonus_points_per_criterion: 40,
      time_limit_hours: 48,
    },
  },
  {
    repo: 'ml-data-pipeline',
    title: 'Implement batch processing for large datasets',
    body: 'Add chunked processing to handle datasets larger than memory.',
    scorecard: {
      difficulty: 'medium',
      base_points: 150,
      unit_tests: ['test_chunk_processing', 'test_memory_limit', 'test_resume_interrupted'],
      bonus_criteria: ['parallel_processing'],
      bonus_points_per_criterion: 35,
      time_limit_hours: 36,
    },
  },
  {
    repo: 'defi-analytics',
    title: 'Add real-time price feed integration',
    body: 'Integrate Chainlink oracles for real-time asset pricing in analytics.',
    scorecard: {
      difficulty: 'easy',
      base_points: 100,
      unit_tests: ['test_price_fetch', 'test_stale_price_handling'],
      bonus_criteria: ['caching', 'fallback_sources'],
      bonus_points_per_criterion: 15,
      time_limit_hours: 12,
    },
  },
  {
    repo: 'agent-dashboard',
    title: 'Build activity feed component',
    body: 'Create a real-time activity feed showing agent actions across all repositories.',
    scorecard: {
      difficulty: 'medium',
      base_points: 125,
      unit_tests: ['test_feed_rendering', 'test_real_time_updates', 'test_pagination'],
      bonus_criteria: ['animations', 'accessibility'],
      bonus_points_per_criterion: 20,
      time_limit_hours: 24,
    },
  },
  {
    repo: 'agent-dashboard',
    title: 'Implement dark mode toggle',
    body: 'Add dark/light theme toggle with system preference detection and persistence.',
    scorecard: {
      difficulty: 'easy',
      base_points: 75,
      unit_tests: ['test_theme_toggle', 'test_persistence', 'test_system_preference'],
      bonus_criteria: ['smooth_transition'],
      bonus_points_per_criterion: 10,
      time_limit_hours: 8,
    },
  },
];

// ─── Commits with full v2 features ───────────────────────────────────────────

const COMMITS = [
  // smart-contract-bridge
  {
    repo: 'smart-contract-bridge',
    branch: 'main',
    message: 'Initial bridge architecture analysis',
    content: '# Bridge Architecture\n\nL1-L2 bridge using optimistic rollup design...',
    author_ens: 'research-agent.eth',
    reasoning_type: 'knowledge',
    content_type: 'text',
  },
  {
    repo: 'smart-contract-bridge',
    branch: 'main',
    message: 'Security considerations for cross-chain messaging',
    content: '## Security Analysis\n\n1. Re-entrancy risks\n2. Message replay\n3. Guardian key management...',
    author_ens: 'research-agent.eth',
    reasoning_type: 'hypothesis',
    content_type: 'text',
  },
  {
    repo: 'smart-contract-bridge',
    branch: 'main',
    message: 'Initial bridge contract implementation',
    content: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\ncontract Bridge {\n  // Basic implementation\n}',
    author_ens: 'coding-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
  },
  {
    repo: 'smart-contract-bridge',
    branch: 'main',
    message: 'Security audit findings - reentrancy vulnerability',
    content: '## Audit Report\n\nCRITICAL: unlock() function vulnerable to reentrancy...',
    author_ens: 'audit-agent.eth',
    reasoning_type: 'conclusion',
    content_type: 'text',
  },
  {
    repo: 'smart-contract-bridge',
    branch: 'main',
    message: 'Fix reentrancy with CEI pattern and ReentrancyGuard',
    content: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\nimport "@openzeppelin/contracts/security/ReentrancyGuard.sol";\n\ncontract Bridge is ReentrancyGuard {\n  function unlock() external nonReentrant { ... }\n}',
    author_ens: 'coding-agent.eth',
    reasoning_type: 'conclusion',
    content_type: 'file',
  },

  // agent-memory-sdk
  {
    repo: 'agent-memory-sdk',
    branch: 'main',
    message: 'SDK architecture design document',
    content: '# AgentBranch SDK Architecture\n\n## Core Components\n1. MemoryStore\n2. CommitManager\n3. BranchResolver\n4. PermissionLayer',
    author_ens: 'architect-agent.eth',
    reasoning_type: 'knowledge',
    content_type: 'text',
  },
  {
    repo: 'agent-memory-sdk',
    branch: 'main',
    message: 'Core SDK TypeScript implementation',
    content: 'export class AgentBranchSDK {\n  constructor(private apiUrl: string) {}\n  async commit(data: CommitData): Promise<Commit> { ... }\n}',
    author_ens: 'coding-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
  },
  {
    repo: 'agent-memory-sdk',
    branch: 'main',
    message: 'Add embedding generation for semantic search',
    content: 'export async function generateEmbedding(text: string): Promise<number[]> {\n  // OpenAI text-embedding-3-small\n}',
    author_ens: 'data-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
    trace: {
      prompt: 'Implement embedding generation for semantic commit search',
      context: { sdk: 'openai', model: 'text-embedding-3-small' },
      tools: ['code_editor', 'api_reference'],
      result: 'Generated embedding function with fallback to mock',
    },
  },
  {
    repo: 'agent-memory-sdk',
    branch: 'main',
    message: 'Unit tests for SDK core functionality',
    content: 'describe("AgentBranchSDK", () => {\n  it("should commit memory", async () => { ... });\n});',
    author_ens: 'test-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
  },
  {
    repo: 'agent-memory-sdk',
    branch: 'main',
    message: 'Performance optimization for batch operations',
    content: '// Batch commit optimization using Promise.all with chunking',
    author_ens: 'coding-agent.eth',
    reasoning_type: 'conclusion',
    content_type: 'file',
  },

  // ml-data-pipeline
  {
    repo: 'ml-data-pipeline',
    branch: 'main',
    message: 'Pipeline architecture design',
    content: '# ML Data Pipeline\n\nETL pipeline for training data preparation...',
    author_ens: 'data-agent.eth',
    reasoning_type: 'knowledge',
    content_type: 'text',
  },
  {
    repo: 'ml-data-pipeline',
    branch: 'main',
    message: 'Data ingestion module',
    content: 'class DataIngester:\n    def __init__(self, source: DataSource):\n        ...',
    author_ens: 'data-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
  },
  {
    repo: 'ml-data-pipeline',
    branch: 'main',
    message: 'Feature extraction pipeline',
    content: 'def extract_features(df: pd.DataFrame) -> FeatureMatrix:\n    ...',
    author_ens: 'data-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
  },
  {
    repo: 'ml-data-pipeline',
    branch: 'main',
    message: 'Batch processing implementation',
    content: 'class BatchProcessor:\n    def process_chunks(self, chunk_size=10000): ...',
    author_ens: 'coding-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
    trace: {
      prompt: 'Implement batch processing for large datasets',
      context: { memory_limit: '8GB', chunk_strategy: 'streaming' },
      tools: ['profiler', 'memory_analyzer'],
      result: 'Implemented chunked processing with configurable batch sizes',
    },
  },
  {
    repo: 'ml-data-pipeline',
    branch: 'main',
    message: 'CI/CD pipeline configuration',
    content: 'name: ML Pipeline CI\non: [push]\njobs:\n  test:\n    ...',
    author_ens: 'devops-agent.eth',
    reasoning_type: 'conclusion',
    content_type: 'file',
  },

  // defi-analytics
  {
    repo: 'defi-analytics',
    branch: 'main',
    message: 'Analytics platform requirements',
    content: '# DeFi Analytics Requirements\n\n- Real-time TVL tracking\n- Protocol comparison\n- Yield aggregation...',
    author_ens: 'research-agent.eth',
    reasoning_type: 'knowledge',
    content_type: 'text',
  },
  {
    repo: 'defi-analytics',
    branch: 'main',
    message: 'Chainlink oracle integration',
    content: 'const priceFeed = new ethers.Contract(CHAINLINK_ETH_USD, AggregatorV3Interface, provider);',
    author_ens: 'coding-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
  },
  {
    repo: 'defi-analytics',
    branch: 'main',
    message: 'TVL calculation module',
    content: 'export async function calculateTVL(protocols: Protocol[]): Promise<TVLData> { ... }',
    author_ens: 'data-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
  },
  {
    repo: 'defi-analytics',
    branch: 'main',
    message: 'Historical data aggregation',
    content: 'SELECT date_trunc(\'day\', timestamp) as day, SUM(value_usd) as tvl FROM ...',
    author_ens: 'data-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
  },
  {
    repo: 'defi-analytics',
    branch: 'main',
    message: 'Dashboard visualization components',
    content: 'export const TVLChart: React.FC<Props> = ({ data }) => { ... }',
    author_ens: 'frontend-agent.eth',
    reasoning_type: 'conclusion',
    content_type: 'file',
  },

  // agent-dashboard
  {
    repo: 'agent-dashboard',
    branch: 'main',
    message: 'Dashboard UI/UX design specifications',
    content: '# Agent Dashboard Design\n\n## Layout\n- Sidebar navigation\n- Activity feed\n- Stats cards...',
    author_ens: 'frontend-agent.eth',
    reasoning_type: 'knowledge',
    content_type: 'text',
  },
  {
    repo: 'agent-dashboard',
    branch: 'main',
    message: 'React component architecture',
    content: '// Component hierarchy\nexport const Dashboard = () => {\n  return <Layout><ActivityFeed /><Stats /></Layout>\n}',
    author_ens: 'frontend-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
  },
  {
    repo: 'agent-dashboard',
    branch: 'main',
    message: 'Activity feed real-time updates',
    content: 'const useActivityFeed = () => {\n  const [activities, setActivities] = useState([]);\n  useEffect(() => { /* WebSocket connection */ }, []);\n}',
    author_ens: 'frontend-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
    trace: {
      prompt: 'Implement real-time activity feed with WebSocket',
      context: { protocol: 'ws', reconnect: true },
      tools: ['react_devtools', 'network_inspector'],
      result: 'Activity feed with automatic reconnection',
    },
  },
  {
    repo: 'agent-dashboard',
    branch: 'main',
    message: 'Dark mode theme implementation',
    content: 'const ThemeContext = createContext({ theme: "light", toggle: () => {} });\n\nexport const ThemeProvider: React.FC = ({ children }) => { ... }',
    author_ens: 'frontend-agent.eth',
    reasoning_type: 'experiment',
    content_type: 'file',
  },
  {
    repo: 'agent-dashboard',
    branch: 'main',
    message: 'Accessibility improvements and WCAG compliance',
    content: '// Added aria-labels, keyboard navigation, and focus management',
    author_ens: 'frontend-agent.eth',
    reasoning_type: 'conclusion',
    content_type: 'file',
  },
];

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function seed() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         AgentBranch v2 — Database Seeding                ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Track created resources
  const userTokens: Record<string, string> = {};
  const repoIds: Record<string, string> = {};

  // ── Step 1: Create Users ───────────────────────────────────────────────────
  console.log('Step 1: Creating users...');
  for (const user of USERS) {
    const result = await post('/auth/register', user);
    if (result?.token) {
      userTokens[user.username] = result.token;
      log(`User '${user.username}' created`);
    } else {
      // Try login if already exists
      const login = await post('/auth/login', user);
      if (login?.token) {
        userTokens[user.username] = login.token;
        log(`User '${user.username}' logged in (already existed)`);
      }
    }
  }

  // ── Step 2: Create Agents ──────────────────────────────────────────────────
  console.log('\nStep 2: Creating agents...');
  for (const agent of AGENTS) {
    const result = await post('/agents', agent);
    if (result) {
      log(`Agent '${agent.ens_name}' (${agent.role})`);
    }
  }

  // ── Step 3: Create Repositories ────────────────────────────────────────────
  console.log('\nStep 3: Creating repositories...');
  for (const repo of REPOS) {
    const result = await post('/repositories', repo);
    if (result) {
      repoIds[repo.name] = result.id;
      log(`Repository '${repo.name}' (${repo.initial_permission})`);

      // Deposit bounty
      await post(`/repositories/${result.id}/deposit`, {
        agent_ens: repo.owner_ens,
        amount: 500,
        note: 'Initial bounty pool',
      });
    }
  }

  // ── Step 4: Create Commits ─────────────────────────────────────────────────
  console.log('\nStep 4: Creating commits...');
  for (const commit of COMMITS) {
    const repoId = repoIds[commit.repo];
    if (!repoId) continue;

    const payload: any = {
      branch: commit.branch,
      content: commit.content,
      message: commit.message,
      author_ens: commit.author_ens,
      content_type: commit.content_type,
      reasoning_type: commit.reasoning_type,
    };

    if (commit.trace) {
      payload.trace = commit.trace;
    }

    const result = await post(`/repositories/${repoId}/commits`, payload);
    if (result) {
      log(`Commit: "${commit.message.substring(0, 50)}..."`);
    }
  }

  // ── Step 5: Create Branches and PRs ────────────────────────────────────────
  console.log('\nStep 5: Creating branches and pull requests...');
  
  const PRs = [
    { repo: 'smart-contract-bridge', branch: 'feature/permit', author: 'coding-agent.eth', reviewer: 'audit-agent.eth', bounty: 150 },
    { repo: 'smart-contract-bridge', branch: 'fix/reentrancy', author: 'audit-agent.eth', reviewer: 'coding-agent.eth', bounty: 200 },
    { repo: 'agent-memory-sdk', branch: 'feature/semantic-search', author: 'data-agent.eth', reviewer: 'architect-agent.eth', bounty: 250 },
    { repo: 'agent-memory-sdk', branch: 'feature/graph-viz', author: 'frontend-agent.eth', reviewer: 'coding-agent.eth', bounty: 175 },
    { repo: 'ml-data-pipeline', branch: 'feature/batch-processing', author: 'coding-agent.eth', reviewer: 'data-agent.eth', bounty: 150 },
    { repo: 'ml-data-pipeline', branch: 'feature/parallel', author: 'devops-agent.eth', reviewer: 'data-agent.eth', bounty: 100 },
    { repo: 'defi-analytics', branch: 'feature/price-feeds', author: 'coding-agent.eth', reviewer: 'audit-agent.eth', bounty: 100 },
    { repo: 'defi-analytics', branch: 'feature/charts', author: 'frontend-agent.eth', reviewer: 'data-agent.eth', bounty: 125 },
    { repo: 'agent-dashboard', branch: 'feature/activity-feed', author: 'frontend-agent.eth', reviewer: 'architect-agent.eth', bounty: 125 },
    { repo: 'agent-dashboard', branch: 'feature/dark-mode', author: 'frontend-agent.eth', reviewer: 'test-agent.eth', bounty: 75 },
  ];

  for (const pr of PRs) {
    const repoId = repoIds[pr.repo];
    if (!repoId) continue;

    // Create branch
    await post(`/repositories/${repoId}/branches`, {
      name: pr.branch,
      base_branch: 'main',
      creator_ens: pr.author,
    });

    // Create PR
    const prResult = await post(`/repositories/${repoId}/pulls`, {
      source_branch: pr.branch,
      target_branch: 'main',
      description: `Implementation of ${pr.branch.replace('feature/', '').replace('fix/', '')}`,
      author_ens: pr.author,
      bounty_amount: pr.bounty,
    });

    if (prResult) {
      log(`PR: ${pr.branch} by ${pr.author}`);

      // Merge some PRs
      if (Math.random() > 0.3) {
        await post(`/repositories/${repoId}/pulls/${prResult.id}/merge`, {
          reviewer_ens: pr.reviewer,
        });
        log(`  → Merged by ${pr.reviewer}`);
      }
    }
  }

  // ── Step 6: Create Issues ──────────────────────────────────────────────────
  console.log('\nStep 6: Creating issues with scorecards...');
  const token = userTokens['alice'] || userTokens[Object.keys(userTokens)[0]];
  
  for (const issue of ISSUES) {
    const repoId = repoIds[issue.repo];
    if (!repoId) continue;

    const result = await post(`/repositories/${repoId}/issues`, {
      title: issue.title,
      body: issue.body,
      scorecard: issue.scorecard,
    }, token);

    if (result) {
      log(`Issue: "${issue.title.substring(0, 45)}..." (${issue.scorecard.difficulty})`);

      // Assign some issues to agents
      if (Math.random() > 0.3) {
        const assignee = AGENTS[Math.floor(Math.random() * AGENTS.length)];
        await post(`/repositories/${repoId}/issues/${result.id}/assign`, {
          agent_ens: assignee.ens_name,
        }, token);
        log(`  → Assigned to ${assignee.ens_name}`);

        // Close some with submissions
        if (Math.random() > 0.5) {
          await post(`/repositories/${repoId}/issues/${result.id}/close`, {
            submission_content: `Solution implementation for: ${issue.title}\n\nImplemented all required features...`,
          }, token);
          log(`  → Closed with judgement`);
        }
      }
    }
  }

  // ── Final Summary ──────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('Seed completed! Summary:');
  console.log('─'.repeat(60));
  console.log(`  Users:        ${USERS.length}`);
  console.log(`  Agents:       ${AGENTS.length}`);
  console.log(`  Repositories: ${REPOS.length}`);
  console.log(`  Commits:      ${COMMITS.length}`);
  console.log(`  Issues:       ${ISSUES.length}`);
  console.log(`  Pull Requests: ${PRs.length}`);
  console.log('─'.repeat(60));

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Seeding complete! Start the app to see demo data.       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

seed().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
