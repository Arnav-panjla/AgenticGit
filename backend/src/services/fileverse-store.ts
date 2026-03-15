/**
 * Fileverse Store — In-Memory Document Database (v7)
 *
 * Replaces PostgreSQL as the data layer for AgentBranch.
 * Each SQL table is stored as an in-memory Map of rows (keyed by UUID).
 * On writes, data is asynchronously persisted to Fileverse dDocs.
 * On startup, data is loaded from Fileverse (or starts empty).
 *
 * This module provides:
 * - insert(table, row) → row with auto-generated id + timestamps
 * - update(table, where, set) → updated rows
 * - find(table, where, options) → matching rows
 * - findOne(table, where) → first matching row or null
 * - remove(table, where) → removed count
 * - count(table, where) → number of matches
 * - raw access via getTable(name)
 *
 * All data lives in memory for speed. Fileverse is the durable backing store.
 */

import { v4 as uuidv4 } from 'uuid';
import { storeNamedDoc, retrieveNamedDoc } from './fileverse';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Row = Record<string, any>;

export interface FindOptions {
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

// ─── Store State ────────────────────────────────────────────────────────────

/** All tables: tableName → Map<id, row> */
const tables = new Map<string, Map<string, Row>>();

/** Track dirty tables that need persistence */
const dirtyTables = new Set<string>();

/** Persistence timer handle */
let persistTimer: ReturnType<typeof setInterval> | null = null;

/** All known table names from the schema */
const TABLE_NAMES = [
  'agents',
  'repositories',
  'branches',
  'commits',
  'pull_requests',
  'permissions',
  'bounty_ledger',
  'users',
  'issues',
  'issue_judgements',
  'agent_scores',
  'issue_bounties',
  'bounty_submissions',
  'wallet_transactions',
  'workflow_runs',
];

// ─── Initialization ─────────────────────────────────────────────────────────

function ensureTable(name: string): Map<string, Row> {
  if (!tables.has(name)) {
    tables.set(name, new Map());
  }
  return tables.get(name)!;
}

/**
 * Initialize all tables. Attempts to load persisted data from Fileverse.
 * Call this once during server startup.
 */
export async function initStore(): Promise<void> {
  console.log('[fileverse-store] Initializing document store...');

  for (const name of TABLE_NAMES) {
    ensureTable(name);

    try {
      const raw = await retrieveNamedDoc(name);
      if (raw) {
        const rows: Row[] = JSON.parse(raw);
        const table = tables.get(name)!;
        for (const row of rows) {
          if (row.id) {
            table.set(row.id, row);
          }
        }
        console.log(`[fileverse-store]   ${name}: loaded ${rows.length} rows`);
      }
    } catch (err) {
      console.error(`[fileverse-store]   ${name}: failed to load —`, err);
    }
  }

  // Start periodic persistence (every 10 seconds for dirty tables)
  if (!persistTimer) {
    persistTimer = setInterval(persistDirtyTables, 10_000);
  }

  console.log('[fileverse-store] Store ready.');
}

/**
 * Persist all dirty tables to Fileverse.
 */
async function persistDirtyTables(): Promise<void> {
  const tablesToPersist = [...dirtyTables];
  dirtyTables.clear();

  for (const name of tablesToPersist) {
    try {
      const table = tables.get(name);
      if (!table) continue;
      const rows = [...table.values()];
      await storeNamedDoc(name, JSON.stringify(rows));
    } catch (err) {
      console.error(`[fileverse-store] Failed to persist ${name}:`, err);
      // Re-mark as dirty so we retry
      dirtyTables.add(name);
    }
  }
}

/**
 * Force-persist all tables now (call on graceful shutdown).
 */
export async function flushStore(): Promise<void> {
  // Mark all non-empty tables as dirty
  for (const [name, table] of tables) {
    if (table.size > 0) dirtyTables.add(name);
  }
  await persistDirtyTables();
  if (persistTimer) {
    clearInterval(persistTimer);
    persistTimer = null;
  }
}

function markDirty(name: string): void {
  dirtyTables.add(name);
}

// ─── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Insert a row into a table. Auto-generates `id` (UUID) and `created_at` if missing.
 */
export function insert(tableName: string, row: Row): Row {
  const table = ensureTable(tableName);
  const id = row.id || uuidv4();
  const now = new Date().toISOString();

  const newRow: Row = {
    ...row,
    id,
    created_at: row.created_at || now,
  };

  table.set(id, newRow);
  markDirty(tableName);
  return { ...newRow };
}

/**
 * Update rows matching `where` conditions. Applies `set` fields to each match.
 * Returns array of updated rows.
 */
export function update(tableName: string, where: Row, set: Row): Row[] {
  const table = ensureTable(tableName);
  const updated: Row[] = [];

  for (const [id, row] of table) {
    if (matchesWhere(row, where)) {
      const updatedRow = { ...row, ...set };
      table.set(id, updatedRow);
      updated.push({ ...updatedRow });
    }
  }

  if (updated.length > 0) markDirty(tableName);
  return updated;
}

/**
 * Find rows matching `where` conditions with optional ordering and pagination.
 */
export function find(tableName: string, where?: Row, options?: FindOptions): Row[] {
  const table = ensureTable(tableName);
  let results: Row[] = [];

  if (!where || Object.keys(where).length === 0) {
    results = [...table.values()].map(r => ({ ...r }));
  } else {
    for (const row of table.values()) {
      if (matchesWhere(row, where)) {
        results.push({ ...row });
      }
    }
  }

  // Order
  if (options?.orderBy) {
    const col = options.orderBy;
    const dir = options.orderDir === 'ASC' ? 1 : -1;
    results.sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (av == null && bv == null) return 0;
      if (av == null) return dir;
      if (bv == null) return -dir;
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }

  // Offset
  if (options?.offset) {
    results = results.slice(options.offset);
  }

  // Limit
  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Find the first row matching `where`, or null.
 */
export function findOne(tableName: string, where: Row): Row | null {
  const table = ensureTable(tableName);

  for (const row of table.values()) {
    if (matchesWhere(row, where)) {
      return { ...row };
    }
  }

  return null;
}

/**
 * Remove rows matching `where`. Returns count of removed rows.
 */
export function remove(tableName: string, where: Row): number {
  const table = ensureTable(tableName);
  let count = 0;

  for (const [id, row] of table) {
    if (matchesWhere(row, where)) {
      table.delete(id);
      count++;
    }
  }

  if (count > 0) markDirty(tableName);
  return count;
}

/**
 * Count rows matching `where`.
 */
export function count(tableName: string, where?: Row): number {
  const table = ensureTable(tableName);

  if (!where || Object.keys(where).length === 0) {
    return table.size;
  }

  let n = 0;
  for (const row of table.values()) {
    if (matchesWhere(row, where)) n++;
  }
  return n;
}

/**
 * Get the raw table Map (for advanced queries).
 */
export function getTable(tableName: string): Map<string, Row> {
  return ensureTable(tableName);
}

/**
 * Insert or update based on unique constraint columns.
 * If a row matching `uniqueOn` exists, updates with `set`. Otherwise inserts `row`.
 */
export function upsert(
  tableName: string,
  row: Row,
  uniqueOn: string[],
  set: Row
): Row {
  const where: Row = {};
  for (const col of uniqueOn) {
    where[col] = row[col];
  }

  const existing = findOne(tableName, where);

  if (existing) {
    const updated = update(tableName, { id: existing.id }, set);
    return updated[0] || existing;
  } else {
    return insert(tableName, row);
  }
}

// ─── Where Matching ─────────────────────────────────────────────────────────

/**
 * Check if a row matches all conditions in `where`.
 * Supports:
 * - Direct equality: { column: value }
 * - null checks: { column: null }
 * - Operators via special keys: { column: { $gt: 5, $in: [...] } }
 */
function matchesWhere(row: Row, where: Row): boolean {
  for (const [key, expected] of Object.entries(where)) {
    const actual = row[key];

    if (expected === null || expected === undefined) {
      if (actual !== null && actual !== undefined) return false;
      continue;
    }

    if (typeof expected === 'object' && !Array.isArray(expected) && expected !== null) {
      // Operator object: { $gt, $gte, $lt, $lte, $ne, $in, $like, $jsonPath }
      if ('$gt' in expected && !(actual > expected.$gt)) return false;
      if ('$gte' in expected && !(actual >= expected.$gte)) return false;
      if ('$lt' in expected && !(actual < expected.$lt)) return false;
      if ('$lte' in expected && !(actual <= expected.$lte)) return false;
      if ('$ne' in expected && actual === expected.$ne) return false;
      if ('$in' in expected && !expected.$in.includes(actual)) return false;
      if ('$like' in expected) {
        const pattern = expected.$like.replace(/%/g, '.*').replace(/_/g, '.');
        if (!new RegExp(`^${pattern}$`, 'i').test(String(actual ?? ''))) return false;
      }
      if ('$notNull' in expected && expected.$notNull === true) {
        if (actual === null || actual === undefined) return false;
      }
      if ('$isNull' in expected && expected.$isNull === true) {
        if (actual !== null && actual !== undefined) return false;
      }
      if ('$jsonPath' in expected) {
        // Simple JSON path check: { $jsonPath: { path: 'failed', value: true } }
        const jp = expected.$jsonPath;
        const obj = typeof actual === 'string' ? JSON.parse(actual) : actual;
        if (!obj || obj[jp.path] !== jp.value) return false;
      }
      continue;
    }

    // Direct equality
    // Handle string/number coercion for UUIDs, numeric comparisons
    if (actual !== expected && String(actual) !== String(expected)) {
      return false;
    }
  }

  return true;
}

// ─── Aggregate Helpers ──────────────────────────────────────────────────────

/**
 * Sum a numeric column across rows matching `where`.
 */
export function sum(tableName: string, column: string, where?: Row): number {
  const rows = find(tableName, where);
  let total = 0;
  for (const row of rows) {
    const val = parseFloat(row[column]);
    if (!isNaN(val)) total += val;
  }
  return total;
}

/**
 * Get the maximum value of a column.
 */
export function max(tableName: string, column: string, where?: Row): any {
  const rows = find(tableName, where);
  if (rows.length === 0) return null;
  return rows.reduce((m, r) => (r[column] > m ? r[column] : m), rows[0][column]);
}

/**
 * Average a numeric column.
 */
export function avg(tableName: string, column: string, where?: Row): number {
  const rows = find(tableName, where);
  if (rows.length === 0) return 0;
  const total = rows.reduce((s, r) => s + (parseFloat(r[column]) || 0), 0);
  return total / rows.length;
}
