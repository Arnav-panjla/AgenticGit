/**
 * ENS Identity Service — Mock/Simulated
 *
 * Provides agent registration and lookup using ENS-style names (agent.eth).
 * No on-chain calls — identities are stored in Postgres.
 */

export function validateEnsName(name: string): boolean {
  return /^[a-z0-9-]+\.eth$/.test(name);
}

export function parseEnsName(name: string): { label: string; tld: string } {
  const parts = name.split('.');
  return { label: parts[0], tld: parts.slice(1).join('.') };
}

/**
 * Generate a deterministic "address" from an ENS name for display purposes.
 */
export function ensToMockAddress(ens: string): string {
  let hash = 0;
  for (let i = 0; i < ens.length; i++) {
    hash = ((hash << 5) - hash + ens.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hex}${'0'.repeat(32)}`.slice(0, 42);
}
