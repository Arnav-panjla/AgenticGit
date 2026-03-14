/**
 * AgentBranch v5 Migration — Failure Memory + Workflow Hooks
 *
 * Adds failure_context JSONB column to commits and creates the
 * workflow_runs table for async hook execution results.
 */

import { pool } from './client';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('─── AgentBranch v5 Migration: Failure Memory + Workflow Hooks ───');

  const schemaPath = path.join(__dirname, 'schema_v5.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await pool.query(sql);
    console.log('[OK] schema_v5.sql applied');
  } catch (err: any) {
    // Graceful handling: column/table might already exist
    if (err.message?.includes('already exists')) {
      console.log('[OK] v5 schema objects already exist — skipping');
    } else {
      throw err;
    }
  }

  // Verify failure_context column
  const { rows: fcRows } = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'commits' AND column_name = 'failure_context'
  `);

  if (fcRows.length > 0) {
    console.log(`[OK] Verified: commits.failure_context (${fcRows[0].data_type})`);
  } else {
    console.error('[FAIL] failure_context column not found after migration');
    process.exit(1);
  }

  // Verify workflow_runs table
  const { rows: wrRows } = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name = 'workflow_runs'
  `);

  if (wrRows.length > 0) {
    console.log('[OK] Verified: workflow_runs table exists');
  } else {
    console.error('[FAIL] workflow_runs table not found after migration');
    process.exit(1);
  }

  console.log('─── v5 Migration complete ───');
  process.exit(0);
}

main().catch((err) => {
  console.error('v5 migration failed:', err);
  process.exit(1);
});
