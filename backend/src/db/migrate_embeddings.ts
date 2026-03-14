import { pool } from './client';

/**
 * One-off helper to add semantic columns to commits with pgvector fallback.
 * Safe to run multiple times.
 */
async function migrateEmbeddings() {
  console.log('Adding embedding/semantic columns to commits...');

  const hasVector = await pool
    .query(`SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') as ok`)
    .then((r) => r.rows[0].ok as boolean);

  const embeddingType = hasVector ? 'vector(1536)' : 'double precision[]';

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'embedding') THEN
        EXECUTE 'ALTER TABLE commits ADD COLUMN embedding ${embeddingType}';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'semantic_summary') THEN
        ALTER TABLE commits ADD COLUMN semantic_summary TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'tags') THEN
        ALTER TABLE commits ADD COLUMN tags TEXT[] DEFAULT '{}';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'reasoning_type') THEN
        ALTER TABLE commits ADD COLUMN reasoning_type VARCHAR(20) CHECK (
          reasoning_type IS NULL OR 
          reasoning_type IN ('knowledge', 'hypothesis', 'experiment', 'conclusion', 'trace')
        );
      END IF;
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
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commits' AND column_name = 'search_vector') THEN
        ALTER TABLE commits ADD COLUMN search_vector tsvector;
      END IF;
    END $$;
  `);

  if (hasVector) {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commits_embedding') THEN
          CREATE INDEX idx_commits_embedding ON commits USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        END IF;
      END $$;
    `);
  }

  await pool.query(`
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
  `);

  console.log('Embedding/semantic columns ensured.');
  await pool.end();
}

migrateEmbeddings().catch((err) => {
  console.error('Embedding migration failed:', err);
  process.exit(1);
});
