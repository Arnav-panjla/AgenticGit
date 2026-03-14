-- ═══════════════════════════════════════════════════════════════════════════════
-- AgentBranch v2 Database Migration
-- ═══════════════════════════════════════════════════════════════════════════════
-- This migration is ADDITIVE ONLY - safe to run on existing v1 databases.
-- Run with: npm run migrate:v2 (or ts-node src/db/migrate_v2.ts)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pgvector might not be installed locally; attempt but don't fail migration
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN undefined_file THEN
    RAISE NOTICE 'pgvector extension not available; skipping vector features';
END $$;

-- ─── Users Table (Authentication) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ─── Alter Agents: Link to User + Deposit Tracking ────────────────────────────
DO $$
BEGIN
  -- Add user_id column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'user_id') THEN
    ALTER TABLE agents ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add deposit_tx_hash for blockchain verification
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'deposit_tx_hash') THEN
    ALTER TABLE agents ADD COLUMN deposit_tx_hash VARCHAR(66);
  END IF;
  
  -- Add deposit_verified flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'deposit_verified') THEN
    ALTER TABLE agents ADD COLUMN deposit_verified BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);

DO $$
DECLARE
  has_vector BOOLEAN := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector');
BEGIN
  -- Semantic commit fields (with pgvector fallback to double precision[])
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'embedding') THEN
    IF has_vector THEN
      ALTER TABLE commits ADD COLUMN embedding vector(1536);
    ELSE
      ALTER TABLE commits ADD COLUMN embedding double precision[];
    END IF;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'semantic_summary') THEN
    ALTER TABLE commits ADD COLUMN semantic_summary TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'tags') THEN
    ALTER TABLE commits ADD COLUMN tags TEXT[] DEFAULT '{}';
  END IF;
  
  -- Reasoning graph fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'reasoning_type') THEN
    ALTER TABLE commits ADD COLUMN reasoning_type VARCHAR(20) CHECK (
      reasoning_type IS NULL OR 
      reasoning_type IN ('knowledge', 'hypothesis', 'experiment', 'conclusion', 'trace')
    );
  END IF;
  
  -- Replay trace fields (for trace-type commits)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'trace_prompt') THEN
    ALTER TABLE commits ADD COLUMN trace_prompt TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'trace_context') THEN
    ALTER TABLE commits ADD COLUMN trace_context JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'trace_tools') THEN
    ALTER TABLE commits ADD COLUMN trace_tools JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'trace_result') THEN
    ALTER TABLE commits ADD COLUMN trace_result TEXT;
  END IF;
END $$;

-- Vector similarity index (IVFFlat for approximate nearest neighbor search)
-- Only create if vector extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    -- Check if index already exists
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commits_embedding') THEN
      CREATE INDEX idx_commits_embedding ON commits USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create vector index: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_commits_reasoning_type ON commits(reasoning_type) WHERE reasoning_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_commits_tags ON commits USING gin(tags);

-- ─── Issues Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'cancelled')),
  scorecard JSONB DEFAULT '{}'::jsonb,
  -- Scorecard structure:
  -- {
  --   "difficulty": "easy" | "medium" | "hard" | "expert",
  --   "base_points": 100,
  --   "unit_tests": [{"name": "test1", "points": 10}, ...],
  --   "bonus_criteria": ["criterion1", "criterion2"],
  --   "bonus_points_per_criterion": 5,
  --   "time_limit_hours": 24,
  --   "required_language": "solidity"
  -- }
  assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_repo ON issues(repo_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_assigned ON issues(assigned_agent_id) WHERE assigned_agent_id IS NOT NULL;

-- ─── Issue Judgements Table (AutoResearch Judge Verdicts) ─────────────────────
CREATE TABLE IF NOT EXISTS issue_judgements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  verdict JSONB NOT NULL,
  -- Verdict structure:
  -- {
  --   "passed_tests": ["test1", "test2"],
  --   "failed_tests": ["test3"],
  --   "bonus_achieved": ["criterion1"],
  --   "bonus_missed": ["criterion2"],
  --   "code_quality_score": 8,
  --   "reasoning": "The solution correctly implements...",
  --   "suggestions": ["Consider adding...", "Could improve..."]
  -- }
  points_awarded INTEGER NOT NULL DEFAULT 0,
  judged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(issue_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_judgements_issue ON issue_judgements(issue_id);
CREATE INDEX IF NOT EXISTS idx_judgements_agent ON issue_judgements(agent_id);

-- ─── Agent Scores Table (Leaderboard) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, issue_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_agent ON agent_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_scores_points ON agent_scores(points DESC);

-- ─── Materialized View for Leaderboard (Optional Performance Optimization) ────
-- Uncomment if needed for high-traffic deployments
-- CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_mv AS
-- SELECT 
--   a.id as agent_id,
--   a.ens_name,
--   a.role,
--   a.reputation_score,
--   COALESCE(SUM(s.points), 0) as total_points,
--   COUNT(DISTINCT s.issue_id) as issues_completed,
--   COUNT(DISTINCT j.id) as judgements_received
-- FROM agents a
-- LEFT JOIN agent_scores s ON a.id = s.agent_id
-- LEFT JOIN issue_judgements j ON a.id = j.agent_id
-- GROUP BY a.id, a.ens_name, a.role, a.reputation_score
-- ORDER BY total_points DESC, reputation_score DESC;
--
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_mv_agent ON leaderboard_mv(agent_id);

-- ─── Full-Text Search Configuration (Fallback for non-pgvector) ───────────────
-- Create tsvector column for full-text search if embeddings aren't available
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'search_vector') THEN
    ALTER TABLE commits ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- Update search vector on insert/update
CREATE OR REPLACE FUNCTION update_commit_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.message, '') || ' ' || COALESCE(NEW.semantic_summary, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS commit_search_vector_trigger ON commits;
CREATE TRIGGER commit_search_vector_trigger
  BEFORE INSERT OR UPDATE ON commits
  FOR EACH ROW
  EXECUTE FUNCTION update_commit_search_vector();

CREATE INDEX IF NOT EXISTS idx_commits_search ON commits USING gin(search_vector);

-- ─── Grant Statements (for non-superuser deployments) ─────────────────────────
-- Uncomment and modify if using a restricted database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO agentbranch_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO agentbranch_app;
