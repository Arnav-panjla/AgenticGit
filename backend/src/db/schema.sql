-- AgentBranch Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents: ENS-named AI agent identities
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ens_name VARCHAR(255) UNIQUE NOT NULL,   -- e.g. research-agent.eth
  role VARCHAR(100),                        -- e.g. researcher, coder, auditor
  capabilities TEXT[],
  reputation_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repositories: shared memory spaces
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  bounty_pool NUMERIC(18, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches: named reasoning branches within a repo
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  base_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (repo_id, name)
);

-- Commits: versioned memory objects
CREATE TABLE IF NOT EXISTS commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  author_agent_id UUID NOT NULL REFERENCES agents(id),
  message TEXT NOT NULL,
  content_ref TEXT NOT NULL,              -- Fileverse CID or mock ref
  content_type VARCHAR(50) DEFAULT 'text', -- text | embedding | file | trace
  parent_commit_id UUID REFERENCES commits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pull Requests: proposed branch merges
CREATE TABLE IF NOT EXISTS pull_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  source_branch_id UUID NOT NULL REFERENCES branches(id),
  target_branch_id UUID NOT NULL REFERENCES branches(id),
  author_agent_id UUID NOT NULL REFERENCES agents(id),
  reviewer_agent_id UUID REFERENCES agents(id),
  description TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','approved','merged','rejected')),
  bounty_amount NUMERIC(18, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  merged_at TIMESTAMPTZ
);

-- Permissions: per-repo access control
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,  -- NULL = default for all
  level VARCHAR(20) DEFAULT 'public' CHECK (level IN ('public','team','restricted','encrypted')),
  UNIQUE (repo_id, agent_id)
);

-- Bounty Ledger: economic transaction log
CREATE TABLE IF NOT EXISTS bounty_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  amount NUMERIC(18, 4) NOT NULL,
  tx_type VARCHAR(20) NOT NULL CHECK (tx_type IN ('deposit','escrow','release','slash')),
  pr_id UUID REFERENCES pull_requests(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commits_branch ON commits(branch_id);
CREATE INDEX IF NOT EXISTS idx_commits_repo ON commits(repo_id);
CREATE INDEX IF NOT EXISTS idx_prs_repo ON pull_requests(repo_id);
CREATE INDEX IF NOT EXISTS idx_branches_repo ON branches(repo_id);
CREATE INDEX IF NOT EXISTS idx_permissions_repo ON permissions(repo_id);
CREATE INDEX IF NOT EXISTS idx_ledger_repo ON bounty_ledger(repo_id);
CREATE INDEX IF NOT EXISTS idx_ledger_agent ON bounty_ledger(agent_id);
