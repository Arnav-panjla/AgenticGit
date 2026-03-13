/**
 * API Client (v2)
 * 
 * Includes auth header support and all v2 endpoints.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'agentbranch_token';

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: getAuthHeaders(),
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Base API Methods ────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: object) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: object) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  ens_name: string;
  role: string;
  capabilities: string[];
  reputation_score: number;
  deposit_verified?: boolean;
  created_at: string;
}

export interface Repository {
  id: string;
  name: string;
  owner_agent_id: string;
  owner_ens?: string;
  description?: string;
  default_permission: 'public' | 'team' | 'private';
  created_at: string;
}

export interface Branch {
  id: string;
  repo_id: string;
  name: string;
  created_by_ens: string;
  commit_count: number;
  created_at: string;
}

export interface Commit {
  id: string;
  repo_id: string;
  branch_id: string;
  branch_name?: string;
  message: string;
  content_ref: string;
  content_type: string;
  author_agent_id: string;
  author_ens?: string;
  parent_commit_id?: string;
  reasoning_type?: 'knowledge' | 'hypothesis' | 'experiment' | 'conclusion' | 'trace';
  semantic_summary?: string;
  tags?: string[];
  created_at: string;
}

export interface PullRequest {
  id: string;
  repo_id: string;
  source_branch_name: string;
  target_branch_name: string;
  description: string;
  status: 'open' | 'merged' | 'rejected';
  author_ens: string;
  reviewer_ens?: string;
  bounty_amount: number;
  created_at: string;
}

export interface Issue {
  id: string;
  repo_id: string;
  title: string;
  body: string;
  status: 'open' | 'in_progress' | 'closed' | 'cancelled';
  scorecard: Scorecard;
  assigned_agent_id?: string;
  assigned_agent_ens?: string;
  created_by_username: string;
  closed_at?: string;
  created_at: string;
  judgements?: Judgement[];
}

export interface Scorecard {
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  base_points: number;
  unit_tests: string[];
  bonus_criteria: string[];
  bonus_points_per_criterion: number;
  time_limit_hours: number;
  required_language?: string;
}

export interface Judgement {
  id: string;
  issue_id: string;
  agent_id: string;
  agent_ens?: string;
  verdict: {
    passed_tests?: string[];
    failed_tests?: string[];
    bonus_achieved?: string[];
    bonus_missed?: string[];
    code_quality_score?: number;
    reasoning?: string;
    suggestions?: string[];
  };
  points_awarded: number;
  judged_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  agent_id: string;
  ens_name: string;
  role: string;
  reputation_score: number;
  total_points: number;
  issues_completed: number;
  deposit_verified: boolean;
}

export interface LeaderboardStats {
  total_agents: number;
  total_points: number;
  total_issues: number;
  issues_closed: number;
}

export interface AgentProfile extends Agent {
  rank: number;
  total_points: number;
  issues_completed: number;
  judgements: Judgement[];
  contributions: { id: string; name: string; commit_count: number; pr_count: number }[];
}

export interface CommitGraph {
  nodes: { id: string; message: string; reasoning_type?: string; author_ens: string }[];
  edges: { from: string; to: string }[];
}

export interface CommitReplay {
  commit: Commit;
  trace?: {
    prompt: string;
    context: Record<string, any>;
    tools: string[];
    result: string;
  };
  reasoningChain: Commit[];
}

export interface BlockchainConfig {
  network: string;
  chainId: number;
  tokenAddress: string;
  depositAmount: string;
  explorerUrl: string;
}

// ─── API Endpoints ───────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string; user: any }>('/auth/login', { username, password }),
  
  register: (username: string, password: string) =>
    api.post<{ token: string; user: any }>('/auth/register', { username, password }),
  
  me: () => api.get<{ user: any; agents: Agent[] }>('/auth/me'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
};

export const agentApi = {
  list: () => api.get<Agent[]>('/agents'),
  get: (ens: string) => api.get<Agent>(`/agents/${ens}`),
  create: (data: { ens_name: string; role: string; capabilities: string[] }) =>
    api.post<Agent>('/agents', data),
};

export const repoApi = {
  list: () => api.get<Repository[]>('/repositories'),
  get: (id: string) => api.get<Repository>(`/repositories/${id}`),
  create: (data: { name: string; owner_ens: string; description?: string; initial_permission?: string }) =>
    api.post<Repository>('/repositories', data),
  branches: (repoId: string) => api.get<Branch[]>(`/repositories/${repoId}/branches`),
  createBranch: (repoId: string, data: { name: string; base_branch: string; creator_ens: string }) =>
    api.post<Branch>(`/repositories/${repoId}/branches`, data),
};

export const commitApi = {
  list: (repoId: string, agentEns: string, branch?: string) => {
    const params = new URLSearchParams({ agent_ens: agentEns });
    if (branch) params.append('branch', branch);
    return api.get<Commit[]>(`/repositories/${repoId}/commits?${params}`);
  },
  
  create: (repoId: string, data: {
    branch: string;
    content: string;
    message: string;
    author_ens: string;
    content_type?: string;
    reasoning_type?: string;
    trace?: { prompt: string; context: Record<string, any>; tools: string[]; result: string };
  }) => api.post<Commit>(`/repositories/${repoId}/commits`, data),
  
  get: (repoId: string, commitId: string) =>
    api.get<CommitReplay>(`/repositories/${repoId}/commits/${commitId}`),
  
  search: (repoId: string, query: string, limit = 10) =>
    api.get<Commit[]>(`/repositories/${repoId}/commits/search?q=${encodeURIComponent(query)}&limit=${limit}`),
  
  graph: (repoId: string, root?: string) => {
    const params = root ? `?root=${root}` : '';
    return api.get<CommitGraph>(`/repositories/${repoId}/commits/graph${params}`);
  },
  
  replay: (repoId: string, commitId: string) =>
    api.get<CommitReplay>(`/repositories/${repoId}/commits/${commitId}/replay`),
};

export const prApi = {
  list: (repoId: string, status?: string) => {
    const params = status ? `?status=${status}` : '';
    return api.get<PullRequest[]>(`/repositories/${repoId}/pulls${params}`);
  },
  
  get: (repoId: string, prId: string) =>
    api.get<PullRequest>(`/repositories/${repoId}/pulls/${prId}`),
  
  create: (repoId: string, data: {
    source_branch: string;
    target_branch: string;
    description: string;
    author_ens: string;
    bounty_amount?: number;
  }) => api.post<PullRequest>(`/repositories/${repoId}/pulls`, data),
  
  merge: (repoId: string, prId: string, reviewerEns: string) =>
    api.post<PullRequest>(`/repositories/${repoId}/pulls/${prId}/merge`, { reviewer_ens: reviewerEns }),
  
  reject: (repoId: string, prId: string, reviewerEns: string) =>
    api.post<PullRequest>(`/repositories/${repoId}/pulls/${prId}/reject`, { reviewer_ens: reviewerEns }),
};

export const issueApi = {
  list: (repoId: string, status?: string) => {
    const params = status ? `?status=${status}` : '';
    return api.get<Issue[]>(`/repositories/${repoId}/issues${params}`);
  },
  
  get: (repoId: string, issueId: string) =>
    api.get<Issue>(`/repositories/${repoId}/issues/${issueId}`),
  
  create: (repoId: string, data: { title: string; body?: string; scorecard?: Partial<Scorecard> }) =>
    api.post<Issue>(`/repositories/${repoId}/issues`, data),
  
  update: (repoId: string, issueId: string, data: Partial<{ title: string; body: string; status: string; scorecard: Scorecard }>) =>
    api.patch<Issue>(`/repositories/${repoId}/issues/${issueId}`, data),
  
  assign: (repoId: string, issueId: string, agentEns: string) =>
    api.post<Issue>(`/repositories/${repoId}/issues/${issueId}/assign`, { agent_ens: agentEns }),
  
  close: (repoId: string, issueId: string, submissionContent?: string) =>
    api.post<{ issue: Issue; judgement: any }>(`/repositories/${repoId}/issues/${issueId}/close`, 
      submissionContent ? { submission_content: submissionContent } : {}),
  
  submit: (repoId: string, issueId: string, agentEns: string, content: string) =>
    api.post<{ judgement: any }>(`/repositories/${repoId}/issues/${issueId}/submit`, { agent_ens: agentEns, content }),
};

export const leaderboardApi = {
  get: (limit = 50, offset = 0, timeframe: 'all' | 'week' | 'month' = 'all') =>
    api.get<{ entries: LeaderboardEntry[]; pagination: any; timeframe: string }>(
      `/leaderboard?limit=${limit}&offset=${offset}&timeframe=${timeframe}`
    ),
  
  stats: () => api.get<LeaderboardStats>('/leaderboard/stats'),
  
  agentProfile: (ensName: string) => api.get<AgentProfile>(`/leaderboard/agents/${ensName}`),
};

export const blockchainApi = {
  config: () => api.get<BlockchainConfig>('/blockchain/config'),
  
  registerAgent: (data: { ens_name: string; role: string; capabilities: string[]; tx_hash: string }) =>
    api.post<Agent>('/blockchain/register-agent', data),
  
  verifyDeposit: (agentId: string, txHash: string) =>
    api.post<{ verified: boolean; agent: Agent }>('/blockchain/verify-deposit', { agent_id: agentId, tx_hash: txHash }),
  
  mockTx: () => api.post<{ tx_hash: string }>('/blockchain/mock-tx', {}),
};
