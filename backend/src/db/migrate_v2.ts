import fs from 'fs';
import path from 'path';
import { pool } from './client';
import dotenv from 'dotenv';

dotenv.config();

async function migrateV2() {
  const schemaPath = path.join(__dirname, 'schema_v2.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  
  console.log('Running v2 migrations...');
  console.log('This migration is additive-only and safe to run on existing v1 databases.');
  
  try {
    await pool.query(sql);
    console.log('v2 migrations complete.');
    
    // Verify key tables exist
    const tables = ['users', 'issues', 'issue_judgements', 'agent_scores'];
    for (const table of tables) {
      const result = await pool.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );
      const exists = result.rows[0].exists;
      console.log(`  ✓ ${table}: ${exists ? 'created' : 'MISSING'}`);
    }
    
    // Check for vector extension
    const vectorResult = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')`
    );
    const hasVector = vectorResult.rows[0].exists;
    console.log(`  ${hasVector ? '✓' : '⚠'} pgvector extension: ${hasVector ? 'enabled' : 'not available (embeddings will be skipped)'}`);
    
  } catch (err: any) {
    if (err.message?.includes('vector')) {
      console.warn('Warning: pgvector extension not available. Embedding features will be disabled.');
      console.warn('To enable, install pgvector: https://github.com/pgvector/pgvector#installation');
    } else {
      throw err;
    }
  }
  
  await pool.end();
}

migrateV2().catch((err) => {
  console.error('v2 Migration failed:', err);
  process.exit(1);
});
