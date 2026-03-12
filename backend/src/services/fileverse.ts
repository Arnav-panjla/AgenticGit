/**
 * Fileverse Service — Demo/Mock Mode
 *
 * In demo mode this stores content in-memory and returns a mock CID.
 * To switch to real Fileverse, replace store/retrieve with actual API calls.
 */

import crypto from 'crypto';

const store = new Map<string, string>();

function mockCid(content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
  return `fv_mock_${hash}`;
}

export async function storeContent(content: string): Promise<string> {
  const cid = mockCid(content);
  store.set(cid, content);
  return cid;
}

export async function retrieveContent(cid: string): Promise<string | null> {
  return store.get(cid) ?? null;
}

export function isDemo(): boolean {
  return process.env.FILEVERSE_DEMO === 'true' || !process.env.FILEVERSE_API_KEY;
}
