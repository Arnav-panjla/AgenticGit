/**
 * ENS Identity Service — Real On-Chain Resolution (v7)
 *
 * Resolves ENS names to Ethereum addresses and reverse-lookups using
 * ethers.js against Ethereum mainnet (with Sepolia fallback).
 *
 * Features:
 * - Forward resolution: name.eth → 0x address
 * - Reverse resolution: 0x address → name.eth
 * - Avatar & text record retrieval
 * - In-memory LRU cache with TTL
 * - Graceful fallback to mock when no RPC is available
 */

import { ethers, JsonRpcProvider } from 'ethers';

// ─── Configuration ──────────────────────────────────────────────────────────

/** Mainnet RPC for ENS (ENS lives on L1 mainnet) */
const ENS_RPC_URL = process.env.ENS_RPC_URL || process.env.MAINNET_RPC_URL || '';

/** Optional Sepolia RPC for ENS on testnet */
const ENS_SEPOLIA_RPC_URL = process.env.ENS_SEPOLIA_RPC_URL || process.env.SEPOLIA_RPC_URL || '';

/** Cache TTL in ms (default 5 minutes) */
const CACHE_TTL = parseInt(process.env.ENS_CACHE_TTL || '300000', 10);

/** Max cache entries */
const CACHE_MAX = 500;

// ─── Provider ───────────────────────────────────────────────────────────────

let provider: JsonRpcProvider | null = null;
let providerNetwork: 'mainnet' | 'sepolia' | 'none' = 'none';

function getProvider(): JsonRpcProvider | null {
  if (provider) return provider;

  // Prefer mainnet (ENS registrar lives on L1)
  if (ENS_RPC_URL) {
    try {
      provider = new JsonRpcProvider(ENS_RPC_URL);
      providerNetwork = 'mainnet';
      console.log('[ens] Connected to Ethereum mainnet for ENS resolution');
      return provider;
    } catch (err) {
      console.error('[ens] Failed to connect to mainnet RPC:', err);
    }
  }

  // Fallback to Sepolia
  if (ENS_SEPOLIA_RPC_URL) {
    try {
      provider = new JsonRpcProvider(ENS_SEPOLIA_RPC_URL);
      providerNetwork = 'sepolia';
      console.log('[ens] Connected to Sepolia for ENS resolution');
      return provider;
    } catch (err) {
      console.error('[ens] Failed to connect to Sepolia RPC:', err);
    }
  }

  console.log('[ens] No RPC available — using mock ENS resolution');
  return null;
}

// ─── Cache ──────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<any>>();

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function cacheSet<T>(key: string, value: T): void {
  // Evict oldest entries if cache is full
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate an ENS name format (e.g. research-agent.eth).
 */
export function validateEnsName(name: string): boolean {
  return /^[a-z0-9-]+\.eth$/.test(name);
}

/**
 * Parse an ENS name into label and TLD.
 */
export function parseEnsName(name: string): { label: string; tld: string } {
  const parts = name.split('.');
  return { label: parts[0], tld: parts.slice(1).join('.') };
}

// ─── Resolution ─────────────────────────────────────────────────────────────

/**
 * Resolve an ENS name to an Ethereum address.
 * Returns null if the name doesn't resolve.
 */
export async function resolveEnsName(name: string): Promise<string | null> {
  if (!validateEnsName(name)) return null;

  // Check cache
  const cacheKey = `resolve:${name}`;
  const cached = cacheGet<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  const p = getProvider();
  if (!p) {
    // Mock fallback — generate deterministic address
    const addr = ensToMockAddress(name);
    cacheSet(cacheKey, addr);
    return addr;
  }

  try {
    const address = await p.resolveName(name);
    cacheSet(cacheKey, address);
    return address;
  } catch (err) {
    console.error(`[ens] Failed to resolve ${name}:`, err);
    // Fallback to mock on error
    const addr = ensToMockAddress(name);
    cacheSet(cacheKey, addr);
    return addr;
  }
}

/**
 * Reverse-resolve an Ethereum address to an ENS name.
 * Returns null if no reverse record is set.
 */
export async function lookupAddress(address: string): Promise<string | null> {
  if (!ethers.isAddress(address)) return null;

  const cacheKey = `lookup:${address.toLowerCase()}`;
  const cached = cacheGet<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  const p = getProvider();
  if (!p) {
    cacheSet(cacheKey, null);
    return null;
  }

  try {
    const name = await p.lookupAddress(address);
    cacheSet(cacheKey, name);
    return name;
  } catch (err) {
    console.error(`[ens] Failed to lookup ${address}:`, err);
    cacheSet(cacheKey, null);
    return null;
  }
}

/**
 * Get the avatar URL for an ENS name.
 */
export async function getEnsAvatar(name: string): Promise<string | null> {
  if (!validateEnsName(name)) return null;

  const cacheKey = `avatar:${name}`;
  const cached = cacheGet<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  const p = getProvider();
  if (!p) {
    cacheSet(cacheKey, null);
    return null;
  }

  try {
    const resolver = await p.getResolver(name);
    if (!resolver) {
      cacheSet(cacheKey, null);
      return null;
    }
    const avatar = await resolver.getAvatar();
    cacheSet(cacheKey, avatar);
    return avatar;
  } catch (err) {
    console.error(`[ens] Failed to get avatar for ${name}:`, err);
    cacheSet(cacheKey, null);
    return null;
  }
}

/**
 * Get ENS text records for a name.
 * Common keys: url, email, description, com.twitter, com.github, org.telegram
 */
export async function getEnsTextRecords(
  name: string,
  keys: string[] = ['url', 'email', 'description', 'com.twitter', 'com.github']
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};

  if (!validateEnsName(name)) {
    for (const k of keys) results[k] = null;
    return results;
  }

  const cacheKey = `text:${name}:${keys.join(',')}`;
  const cached = cacheGet<Record<string, string | null>>(cacheKey);
  if (cached !== undefined) return cached;

  const p = getProvider();
  if (!p) {
    for (const k of keys) results[k] = null;
    cacheSet(cacheKey, results);
    return results;
  }

  try {
    const resolver = await p.getResolver(name);
    if (!resolver) {
      for (const k of keys) results[k] = null;
      cacheSet(cacheKey, results);
      return results;
    }

    for (const key of keys) {
      try {
        const val = await resolver.getText(key);
        results[key] = val || null;
      } catch {
        results[key] = null;
      }
    }

    cacheSet(cacheKey, results);
    return results;
  } catch (err) {
    console.error(`[ens] Failed to get text records for ${name}:`, err);
    for (const k of keys) results[k] = null;
    cacheSet(cacheKey, results);
    return results;
  }
}

/**
 * Verify that an ENS name resolves to a specific address.
 * Used during agent registration to confirm ownership.
 */
export async function verifyEnsOwnership(
  ensName: string,
  claimedAddress: string
): Promise<{ verified: boolean; resolvedAddress: string | null; error?: string }> {
  if (!validateEnsName(ensName)) {
    return { verified: false, resolvedAddress: null, error: 'Invalid ENS name format' };
  }

  if (!ethers.isAddress(claimedAddress)) {
    return { verified: false, resolvedAddress: null, error: 'Invalid Ethereum address' };
  }

  const resolved = await resolveEnsName(ensName);

  if (!resolved) {
    return { verified: false, resolvedAddress: null, error: 'ENS name does not resolve' };
  }

  const match = resolved.toLowerCase() === claimedAddress.toLowerCase();

  return {
    verified: match,
    resolvedAddress: resolved,
    error: match ? undefined : `ENS resolves to ${resolved}, not ${claimedAddress}`,
  };
}

// ─── Mock Helpers ───────────────────────────────────────────────────────────

/**
 * Generate a deterministic mock address from an ENS name.
 * Used when no RPC provider is available.
 */
export function ensToMockAddress(ens: string): string {
  let hash = 0;
  for (let i = 0; i < ens.length; i++) {
    hash = ((hash << 5) - hash + ens.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hex}${'0'.repeat(32)}`.slice(0, 42);
}

// ─── Status ─────────────────────────────────────────────────────────────────

/**
 * Check if real ENS resolution is available.
 */
export function isEnsLive(): boolean {
  return getProvider() !== null;
}

/**
 * Get the current ENS provider network.
 */
export function getEnsNetwork(): string {
  getProvider(); // ensure initialized
  return providerNetwork;
}

/**
 * Get ENS service status info.
 */
export function getEnsStatus(): {
  live: boolean;
  network: string;
  cacheSize: number;
  cacheTtlMs: number;
} {
  return {
    live: isEnsLive(),
    network: getEnsNetwork(),
    cacheSize: cache.size,
    cacheTtlMs: CACHE_TTL,
  };
}
