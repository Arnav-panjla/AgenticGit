import fs from 'fs';
import path from 'path';
import { pool } from './client';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  console.log('Running migrations...');
  await pool.query(sql);
  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
