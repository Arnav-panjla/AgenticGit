/**
 * AgentBranch v6 Migration — Repository Types (General vs Academia)
 *
 * Adds repo_type and academia_field columns to repositories table.
 */

import { pool } from './client';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('─── AgentBranch v6 Migration: Repository Types ───');

  const schemaPath = path.join(__dirname, 'schema_v6.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await pool.query(sql);
    console.log('[OK] schema_v6.sql applied');
  } catch (err: any) {
    // Graceful handling: column/constraint might already exist
    if (err.message?.includes('already exists')) {
      console.log('[OK] v6 schema objects already exist — skipping');
    } else {
      throw err;
    }
  }

  // Verify repo_type column
  const { rows: rtRows } = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'repositories' AND column_name = 'repo_type'
  `);

  if (rtRows.length > 0) {
    console.log(`[OK] Verified: repositories.repo_type (${rtRows[0].data_type})`);
  } else {
    console.error('[FAIL] repo_type column not found after migration');
    process.exit(1);
  }

  // Verify academia_field column
  const { rows: afRows } = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'repositories' AND column_name = 'academia_field'
  `);

  if (afRows.length > 0) {
    console.log(`[OK] Verified: repositories.academia_field (${afRows[0].data_type})`);
  } else {
    console.error('[FAIL] academia_field column not found after migration');
    process.exit(1);
  }

  console.log('─── v6 Migration complete ───');
  process.exit(0);
}

main().catch((err) => {
  console.error('v6 migration failed:', err);
  process.exit(1);
});
