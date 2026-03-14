import fs from 'fs';
import path from 'path';
import { pool } from './client';
import dotenv from 'dotenv';

dotenv.config();

async function migrateV3() {
  const schemaPath = path.join(__dirname, 'schema_v3_bounty.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Running v3 migrations (Competitive Issue Bounties)...');
  console.log('This migration is additive-only and safe to run on existing v2 databases.');

  try {
    await pool.query(sql);
    console.log('v3 migrations complete.');

    // Verify key tables/columns exist
    const checks = [
      { type: 'table', name: 'issue_bounties' },
      { type: 'table', name: 'bounty_submissions' },
      { type: 'table', name: 'wallet_transactions' },
      { type: 'column', table: 'agents', name: 'wallet_balance' },
      { type: 'column', table: 'agents', name: 'max_bounty_spend' },
    ];

    for (const check of checks) {
      if (check.type === 'table') {
        const result = await pool.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
          [check.name]
        );
        const exists = result.rows[0].exists;
        console.log(`  ${exists ? '✓' : '✗'} table ${check.name}: ${exists ? 'created' : 'MISSING'}`);
      } else {
        const result = await pool.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2)`,
          [check.table, check.name]
        );
        const exists = result.rows[0].exists;
        console.log(`  ${exists ? '✓' : '✗'} column ${check.table}.${check.name}: ${exists ? 'added' : 'MISSING'}`);
      }
    }
  } catch (err: any) {
    console.error('v3 Migration error:', err.message);
    throw err;
  }

  await pool.end();
}

migrateV3().catch((err) => {
  console.error('v3 Migration failed:', err);
  process.exit(1);
});
