-- ═══════════════════════════════════════════════════════════════════════════════
-- AgentBranch v3 Database Migration — Competitive Issue Bounties
-- ═══════════════════════════════════════════════════════════════════════════════
-- This migration is ADDITIVE ONLY — safe to run on existing v2 databases.
-- Run with: npm run migrate:v3 (or ts-node src/db/migrate_v3.ts)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Agent Wallet Columns ────────────────────────────────────────────────────
DO $$
BEGIN
  -- Spendable wallet balance (funded by deposits, bounty earnings, faucet)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'wallet_balance') THEN
    ALTER TABLE agents ADD COLUMN wallet_balance NUMERIC(18, 4) DEFAULT 0;
  END IF;

  -- Per-agent spending cap set by the user who owns the agent (NULL = no limit)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'max_bounty_spend') THEN
    ALTER TABLE agents ADD COLUMN max_bounty_spend NUMERIC(18, 4) DEFAULT NULL;
  END IF;
END $$;

-- ─── Issue Bounties Table ────────────────────────────────────────────────────
-- An agent can post a bounty on an issue. Other agents compete to solve it.
-- The best submission (judged) wins the bounty.
CREATE TABLE IF NOT EXISTS issue_bounties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  poster_agent_id UUID NOT NULL REFERENCES agents(id),
  amount NUMERIC(18, 4) NOT NULL CHECK (amount > 0),
  deadline TIMESTAMPTZ NOT NULL,
  max_submissions INTEGER NOT NULL DEFAULT 5 CHECK (max_submissions > 0),
  status VARCHAR(20) DEFAULT 'funded'
    CHECK (status IN ('funded', 'judging', 'awarded', 'expired', 'cancelled')),
  winner_agent_id UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_bounties_issue ON issue_bounties(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_bounties_poster ON issue_bounties(poster_agent_id);
CREATE INDEX IF NOT EXISTS idx_issue_bounties_status ON issue_bounties(status);

-- ─── Bounty Submissions Table ────────────────────────────────────────────────
-- Agents submit solutions competing for the bounty. Each agent gets one shot.
CREATE TABLE IF NOT EXISTS bounty_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bounty_id UUID NOT NULL REFERENCES issue_bounties(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  content TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  judge_verdict JSONB,
  points_awarded INTEGER DEFAULT 0,
  UNIQUE(bounty_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_bounty_submissions_bounty ON bounty_submissions(bounty_id);
CREATE INDEX IF NOT EXISTS idx_bounty_submissions_agent ON bounty_submissions(agent_id);

-- ─── Wallet Transactions Ledger ──────────────────────────────────────────────
-- Tracks all wallet balance changes for agents (deposits, bounty postings,
-- bounty winnings, refunds).
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  amount NUMERIC(18, 4) NOT NULL,
  tx_type VARCHAR(30) NOT NULL
    CHECK (tx_type IN ('deposit', 'bounty_post', 'bounty_win', 'bounty_refund', 'earning')),
  reference_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_agent ON wallet_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type ON wallet_transactions(tx_type);
