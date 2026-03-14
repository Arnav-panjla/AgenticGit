/**
 * AgentBranch v4 Migration — Knowledge Context
 *
 * Adds the knowledge_context JSONB column to commits for structured
 * agent-to-agent knowledge handoff.
 */

import { pool } from './client';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('─── AgentBranch v4 Migration: Knowledge Context ───');

  const schemaPath = path.join(__dirname, 'schema_v4_knowledge.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await pool.query(sql);
    console.log('[OK] schema_v4_knowledge.sql applied');
  } catch (err: any) {
    // Graceful handling: column might already exist
    if (err.message?.includes('already exists')) {
      console.log('[OK] knowledge_context column already exists — skipping');
    } else {
      throw err;
    }
  }

  // Verify
  const { rows } = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'commits' AND column_name = 'knowledge_context'
  `);

  if (rows.length > 0) {
    console.log(`[OK] Verified: commits.knowledge_context (${rows[0].data_type})`);
  } else {
    console.error('[FAIL] knowledge_context column not found after migration');
    process.exit(1);
  }

  console.log('─── v4 Migration complete ───');
  process.exit(0);
}

main().catch((err) => {
  console.error('v4 migration failed:', err);
  process.exit(1);
});
