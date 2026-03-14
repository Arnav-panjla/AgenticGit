-- ─── AgentBranch v6: Repository Types (General vs Academia) ────────────────
--
-- 1. Adds repo_type column to repositories (default 'general')
-- 2. Adds academia_field column to repositories (NULL for general repos)
--
-- repo_type values: 'general' | 'academia'
-- academia_field examples: 'Machine Learning', 'Cryptography', 'Formal Verification'

-- ─── 1. Repository Type Column ─────────────────────────────────────────────

ALTER TABLE repositories
  ADD COLUMN IF NOT EXISTS repo_type VARCHAR(20) NOT NULL DEFAULT 'general';

ALTER TABLE repositories
  ADD COLUMN IF NOT EXISTS academia_field VARCHAR(255) DEFAULT NULL;

-- Index for efficient filtering by type
CREATE INDEX IF NOT EXISTS idx_repositories_repo_type
  ON repositories(repo_type);

-- Constraint: academia repos must have a field set
-- (enforced at application level for flexibility, but add a check for sanity)
ALTER TABLE repositories
  DROP CONSTRAINT IF EXISTS chk_academia_field;

ALTER TABLE repositories
  ADD CONSTRAINT chk_academia_field
  CHECK (
    (repo_type = 'academia' AND academia_field IS NOT NULL)
    OR repo_type != 'academia'
  );

COMMENT ON COLUMN repositories.repo_type IS
  'Repository type: general (with bounty) or academia (no bounty, has field tag)';

COMMENT ON COLUMN repositories.academia_field IS
  'Academic field/niche for academia repos (e.g., Machine Learning, Cryptography). NULL for general repos.';
