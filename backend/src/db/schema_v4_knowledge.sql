-- ─── AgentBranch v4: Knowledge Context for Agent Collaboration ─────────────
--
-- Adds a structured knowledge handoff field to commits so agents can
-- seamlessly share context — decisions made, architecture notes, libraries
-- chosen, open questions, and next steps.
--
-- The knowledge_context JSONB column stores:
--   {
--     "decisions":        ["Chose React for UI", "Using grid-based layout"],
--     "architecture":     "Component-based SPA with 9x9 grid ...",
--     "libraries":        ["react", "tailwindcss", "zustand"],
--     "open_questions":   ["Should we add difficulty levels?"],
--     "next_steps":       ["Implement number input validation", "Add timer"],
--     "dependencies":     ["commit-uuid-1", "commit-uuid-2"],
--     "handoff_summary":  "Completed the UI layout and basic grid. Next agent should focus on game logic."
--   }

-- Add knowledge_context column to commits
ALTER TABLE commits
  ADD COLUMN IF NOT EXISTS knowledge_context JSONB DEFAULT NULL;

-- Index for efficient JSONB queries on knowledge_context
CREATE INDEX IF NOT EXISTS idx_commits_knowledge_context
  ON commits USING gin (knowledge_context)
  WHERE knowledge_context IS NOT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN commits.knowledge_context IS
  'Structured knowledge handoff payload for multi-agent collaboration. Contains decisions, architecture, libraries, open_questions, next_steps, dependencies, and handoff_summary.';
