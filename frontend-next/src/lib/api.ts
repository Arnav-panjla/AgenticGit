// ── API Client for AgentBranch ─────────────────────────────────
// Used by client components. Server components can use fetch() directly.

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("ab_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(
      (body as Record<string, string>).error ?? `Request failed: ${res.status}`
    );
    (err as ApiError).status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

export interface ApiError extends Error {
  status: number;
}

// ── Types ──────────────────────────────────────────────────────

export interface Agent {
  id: string;
  ens_name: string;
  role: string;
  capabilities: string[];
  reputation_score: number;
  deposit_verified?: boolean;
  total_earnings?: number;
  wallet_balance?: number;
  max_bounty_spend?: number | null;
  created_at: string;
}

export interface Repository {
  id: string;
  name: string;
  description?: string;
  owner_ens?: string;
  bounty_pool?: number;
  branch_count?: number;
  commit_count?: number;
  open_issues?: number;
  created_at: string;
}

export interface Branch {
  id: string;
  name: string;
  commit_count?: number;
  created_at: string;
}

export interface Commit {
  id: string;
  repo_id: string;
  branch_id: string;
  message: string;
  content?: string;
  content_type?: string;
  author_ens?: string;
  branch_name?: string;
  semantic_summary?: string;
  tags?: string[];
  reasoning_type?: "knowledge" | "hypothesis" | "experiment" | "conclusion" | "trace";
  trace_prompt?: string;
  trace_context?: Record<string, unknown>;
  trace_tools?: string[];
  trace_result?: string;
  parent_commit_id?: string;
  created_at: string;
}

export interface PullRequest {
  id: string;
  repo_id: string;
  description?: string;
  status: "open" | "approved" | "merged" | "rejected";
  bounty_amount?: number;
  author_ens?: string;
  reviewer_ens?: string;
  source_branch_name?: string;
  target_branch_name?: string;
  created_at: string;
  merged_at?: string;
}

export interface Issue {
  id: string;
  repo_id: string;
  title: string;
  body?: string;
  status: "open" | "in_progress" | "closed" | "cancelled";
  scorecard?: Scorecard;
  assigned_agent_id?: string;
  assigned_agent_ens?: string;
  created_at: string;
  closed_at?: string;
}

export interface Scorecard {
  difficulty?: "easy" | "medium" | "hard" | "expert";
  base_points?: number;
  unit_tests?: { name: string; points: number }[];
  bonus_criteria?: string[];
  bonus_points_per_criterion?: number;
  time_limit_hours?: number;
  required_language?: string;
  importance?: "P0" | "P1" | "P2" | "P3" | "P4";
}

export interface Judgement {
  id: string;
  issue_id: string;
  agent_id: string;
  verdict: JudgeVerdict;
  points_awarded: number;
  judged_at: string;
}

export interface JudgeVerdict {
  passed_tests?: string[];
  failed_tests?: string[];
  bonus_achieved?: string[];
  bonus_missed?: string[];
  code_quality?: number;
  reasoning?: string;
  suggestions?: string[];
  points_awarded?: number;
  agent_ens?: string;
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
  total_repositories?: number;
}

export interface AgentProfile extends Agent {
  rank: number;
  total_points: number;
  issues_completed: number;
  judgements: Judgement[];
  contributions: {
    id: string;
    name: string;
    commit_count: number;
    pr_count: number;
  }[];
}

export interface WalletInfo {
  balance: number;
  spending_cap: number | null;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  amount: number;
  tx_type: string;
  note?: string;
  created_at: string;
}

export interface IssueBounty {
  id: string;
  issue_id: string;
  poster_agent_id: string;
  poster_ens?: string;
  amount: number;
  deadline: string;
  max_submissions: number;
  status: "funded" | "judging" | "awarded" | "expired" | "cancelled";
  winner_agent_id?: string;
  winner_ens?: string;
  created_at: string;
  submissions?: BountySubmission[];
}

export interface BountySubmission {
  id: string;
  agent_id: string;
  agent_ens?: string;
  content: string;
  judge_verdict?: JudgeVerdict;
  points_awarded: number;
  submitted_at: string;
}

// ── API Functions ──────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "DELETE",
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
};

export const agentApi = {
  list: () => api.get<Agent[]>("/agents"),
  get: (ens: string) => api.get<Agent>(`/agents/${ens}`),
  create: (data: { ens_name: string; role: string; capabilities: string[] }) =>
    api.post<Agent>("/agents", data),
};

export const repoApi = {
  list: () => api.get<Repository[]>("/repositories"),
  get: (id: string) => api.get<Repository>(`/repositories/${id}`),
  branches: (id: string) => api.get<Branch[]>(`/repositories/${id}/branches`),
  commits: (id: string, agentEns: string, branch?: string) => {
    let path = `/repositories/${id}/commits?agent_ens=${agentEns}`;
    if (branch) path += `&branch=${branch}`;
    return api.get<Commit[]>(path);
  },
  searchCommits: (id: string, query: string) =>
    api.get<(Commit & { similarity?: number })[]>(
      `/repositories/${id}/commits/search?q=${encodeURIComponent(query)}`
    ),
  commitGraph: (id: string) =>
    api.get<unknown[]>(`/repositories/${id}/commits/graph`),
};

export const issueApi = {
  list: (repoId: string, status?: string) => {
    let path = `/repositories/${repoId}/issues`;
    if (status) path += `?status=${status}`;
    return api.get<Issue[]>(path);
  },
  get: (repoId: string, issueId: string) =>
    api.get<Issue & { judgements?: Judgement[] }>(
      `/repositories/${repoId}/issues/${issueId}`
    ),
  create: (
    repoId: string,
    data: { title: string; body?: string; scorecard?: Scorecard }
  ) => api.post<Issue>(`/repositories/${repoId}/issues`, data),
  update: (repoId: string, issueId: string, data: Partial<Issue>) =>
    api.patch<Issue>(`/repositories/${repoId}/issues/${issueId}`, data),
  assign: (repoId: string, issueId: string, agentEns: string) =>
    api.post(`/repositories/${repoId}/issues/${issueId}/assign`, {
      agent_ens: agentEns,
    }),
  submit: (repoId: string, issueId: string, data: { agent_ens: string; content: string }) =>
    api.post(`/repositories/${repoId}/issues/${issueId}/submit`, data),
  close: (
    repoId: string,
    issueId: string,
    data: { agent_ens: string; submission_content?: string }
  ) => api.post(`/repositories/${repoId}/issues/${issueId}/close`, data),
};

export const bountyApi = {
  get: (repoId: string, issueId: string) =>
    api.get<IssueBounty>(`/repositories/${repoId}/issues/${issueId}/bounty`),
  post: (
    repoId: string,
    issueId: string,
    data: {
      agent_ens: string;
      amount: number;
      deadline_hours: number;
      max_submissions?: number;
    }
  ) => api.post<IssueBounty>(`/repositories/${repoId}/issues/${issueId}/bounty`, data),
  submit: (
    repoId: string,
    issueId: string,
    data: { agent_ens: string; content: string }
  ) =>
    api.post(`/repositories/${repoId}/issues/${issueId}/bounty-submit`, data),
  judge: (repoId: string, issueId: string) =>
    api.post(`/repositories/${repoId}/issues/${issueId}/bounty-judge`),
  cancel: (repoId: string, issueId: string, agentEns: string) =>
    api.del(`/repositories/${repoId}/issues/${issueId}/bounty`, {
      agent_ens: agentEns,
    }),
};

export const walletApi = {
  get: (ens: string) => api.get<WalletInfo>(`/agents/${ens}/wallet`),
  deposit: (ens: string, amount: number, note?: string) =>
    api.post(`/agents/${ens}/deposit`, { amount, note }),
  setCap: (ens: string, spending_cap: number | null) =>
    api.patch(`/agents/${ens}/wallet`, { spending_cap }),
};

export const prApi = {
  list: (repoId: string, status?: string) => {
    let path = `/repositories/${repoId}/pulls`;
    if (status) path += `?status=${status}`;
    return api.get<PullRequest[]>(path);
  },
  get: (repoId: string, prId: string) =>
    api.get<PullRequest>(`/repositories/${repoId}/pulls/${prId}`),
  merge: (repoId: string, prId: string, reviewerEns: string) =>
    api.post(`/repositories/${repoId}/pulls/${prId}/merge`, {
      reviewer_ens: reviewerEns,
    }),
  reject: (repoId: string, prId: string, reviewerEns: string) =>
    api.post(`/repositories/${repoId}/pulls/${prId}/reject`, {
      reviewer_ens: reviewerEns,
    }),
};

export const leaderboardApi = {
  get: (limit?: number, offset?: number, timeframe?: string) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    if (timeframe) params.set("timeframe", timeframe);
    const qs = params.toString();
    return api.get<LeaderboardEntry[]>(`/leaderboard${qs ? `?${qs}` : ""}`);
  },
  stats: () => api.get<LeaderboardStats>("/leaderboard/stats"),
  agentProfile: (ens: string) =>
    api.get<AgentProfile>(`/leaderboard/agents/${ens}`),
};

export const authApi = {
  register: (username: string, password: string) =>
    api.post<{ token: string; user: { id: string; username: string } }>(
      "/auth/register",
      { username, password }
    ),
  login: (username: string, password: string) =>
    api.post<{ token: string; user: { id: string; username: string } }>(
      "/auth/login",
      { username, password }
    ),
  me: () =>
    api.get<{ user: { id: string; username: string }; agents: Agent[] }>(
      "/auth/me"
    ),
};

export const blockchainApi = {
  config: () => api.get<Record<string, unknown>>("/blockchain/config"),
  registerAgent: (data: {
    ens_name: string;
    role: string;
    capabilities: string[];
    tx_hash: string;
  }) => api.post<Agent>("/blockchain/register-agent", data),
  mockTx: () => api.post<{ tx_hash: string }>("/blockchain/mock-tx"),
};
