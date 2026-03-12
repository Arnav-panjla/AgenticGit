/**
 * Bounty Ledger Service
 *
 * Manages economic transactions for repositories:
 * - deposit: add funds to repo bounty pool
 * - escrow: lock funds when PR is opened
 * - release: pay out to agent on PR merge
 * - slash: remove funds (e.g. rejected PR penalty)
 */

import { query, queryOne } from '../db/client';

export type TxType = 'deposit' | 'escrow' | 'release' | 'slash';

export interface LedgerEntry {
  id: string;
  repo_id: string;
  agent_id: string;
  amount: number;
  tx_type: TxType;
  pr_id: string | null;
  note: string | null;
  created_at: string;
}

export async function deposit(repoId: string, agentId: string, amount: number, note?: string): Promise<LedgerEntry> {
  // Update repo bounty pool
  await query('UPDATE repositories SET bounty_pool = bounty_pool + $1 WHERE id = $2', [amount, repoId]);

  const [entry] = await query<LedgerEntry>(
    `INSERT INTO bounty_ledger (repo_id, agent_id, amount, tx_type, note)
     VALUES ($1, $2, $3, 'deposit', $4) RETURNING *`,
    [repoId, agentId, amount, note ?? `Deposit of ${amount}`]
  );
  return entry;
}

export async function escrow(repoId: string, agentId: string, amount: number, prId: string): Promise<LedgerEntry> {
  const [entry] = await query<LedgerEntry>(
    `INSERT INTO bounty_ledger (repo_id, agent_id, amount, tx_type, pr_id, note)
     VALUES ($1, $2, $3, 'escrow', $4, 'Bounty escrowed for PR') RETURNING *`,
    [repoId, agentId, amount, prId]
  );
  // Update PR bounty amount
  await query('UPDATE pull_requests SET bounty_amount = $1 WHERE id = $2', [amount, prId]);
  return entry;
}

export async function release(repoId: string, agentId: string, amount: number, prId: string): Promise<LedgerEntry> {
  // Deduct from repo pool
  await query('UPDATE repositories SET bounty_pool = GREATEST(0, bounty_pool - $1) WHERE id = $2', [amount, repoId]);
  // Bump agent reputation
  await query('UPDATE agents SET reputation_score = reputation_score + 10 WHERE id = $1', [agentId]);

  const [entry] = await query<LedgerEntry>(
    `INSERT INTO bounty_ledger (repo_id, agent_id, amount, tx_type, pr_id, note)
     VALUES ($1, $2, $3, 'release', $4, 'Bounty released on PR merge') RETURNING *`,
    [repoId, agentId, amount, prId]
  );
  return entry;
}

export async function slash(repoId: string, agentId: string, amount: number, note: string): Promise<LedgerEntry> {
  const [entry] = await query<LedgerEntry>(
    `INSERT INTO bounty_ledger (repo_id, agent_id, amount, tx_type, note)
     VALUES ($1, $2, $3, 'slash', $4) RETURNING *`,
    [repoId, agentId, amount, note]
  );
  return entry;
}

export async function getLedger(repoId: string): Promise<LedgerEntry[]> {
  return query<LedgerEntry>(
    `SELECT bl.*, a.ens_name FROM bounty_ledger bl
     JOIN agents a ON bl.agent_id = a.id
     WHERE bl.repo_id = $1
     ORDER BY bl.created_at DESC`,
    [repoId]
  );
}

export async function getAgentEarnings(agentId: string): Promise<number> {
  const result = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM bounty_ledger
     WHERE agent_id = $1 AND tx_type = 'release'`,
    [agentId]
  );
  return parseFloat(result?.total ?? '0');
}
