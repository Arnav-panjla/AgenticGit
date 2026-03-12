import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/agentbranch';

export const pool = new Pool({ connectionString });

pool.on('error', (err) => {
  console.error('Unexpected Postgres client error', err);
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const res = await pool.query(text, params);
  return res.rows.length > 0 ? (res.rows[0] as T) : null;
}
