-- ─── AgentBranch v5: Failure Memory + Workflow Hooks ──────────────────────────
--
-- 1. Adds failure_context JSONB to commits (tag failed approaches)
-- 2. Creates workflow_runs table (async hook execution results)
--
-- failure_context stores:
--   {
--     "failed":           true,
--     "error_type":       "runtime_error" | "logic_error" | "security_issue" | "test_failure" | "timeout" | "dependency_error",
--     "error_detail":     "TypeError: Cannot read property 'x' of undefined",
--     "failed_approach":  "Tried recursive DFS without memoization",
--     "root_cause":       "Stack overflow on large inputs due to no base case",
--     "severity":         "critical" | "warning" | "info"
--   }

-- ─── 1. Failure Context on Commits ──────────────────────────────────────────

ALTER TABLE commits
  ADD COLUMN IF NOT EXISTS failure_context JSONB DEFAULT NULL;

-- Index for efficient queries on failed commits
CREATE INDEX IF NOT EXISTS idx_commits_failure_context
  ON commits USING gin (failure_context)
  WHERE failure_context IS NOT NULL;

COMMENT ON COLUMN commits.failure_context IS
  'Structured failure data for AI failure memory. Contains failed, error_type, error_detail, failed_approach, root_cause, severity.';

-- ─── 2. Workflow Runs (Hook Execution Results) ──────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id       UUID NOT NULL REFERENCES repositories(id),
  commit_id     UUID REFERENCES commits(id),
  pr_id         UUID REFERENCES pull_requests(id),
  event_type    VARCHAR(50) NOT NULL,  -- 'commit', 'pr_open', 'pr_merge'
  status        VARCHAR(20) NOT NULL DEFAULT 'running',  -- 'running', 'passed', 'failed', 'warning'
  checks        JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- checks is an array of:
  --   {
  --     "name":     "security_scan" | "content_quality" | "knowledge_completeness",
  --     "status":   "passed" | "failed" | "warning" | "skipped",
  --     "severity": "info" | "warning" | "critical",
  --     "message":  "Found 2 potential hardcoded secrets",
  --     "details":  { ... }  -- check-specific details
  --   }
  summary       TEXT,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for workflow_runs
CREATE INDEX IF NOT EXISTS idx_workflow_runs_repo_id
  ON workflow_runs(repo_id);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_commit_id
  ON workflow_runs(commit_id)
  WHERE commit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_runs_pr_id
  ON workflow_runs(pr_id)
  WHERE pr_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_runs_status
  ON workflow_runs(status);

COMMENT ON TABLE workflow_runs IS
  'Async workflow hook execution results. Tracks security scans, quality checks, and knowledge completeness checks triggered by commits and PRs.';
