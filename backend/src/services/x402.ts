/**
 * x402 Payment Service (v7)
 *
 * Integrates the Coinbase x402 HTTP payment protocol for agent-to-agent
 * micropayments on Base Sepolia. Uses @x402/core for payment verification
 * and settlement, adapted for Fastify (the x402/express middleware targets
 * Express only).
 *
 * Flow:
 *   1. Agent makes request to a payment-gated endpoint
 *   2. If no valid PAYMENT-SIGNATURE header → 402 with payment requirements
 *   3. Agent signs an EIP-712 payment payload using their wallet key
 *   4. Server verifies via facilitator, serves the resource, then settles
 *
 * We use the public Coinbase facilitator at https://facilitator.x402.org
 * which supports Base Sepolia (eip155:84532) with USDC.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ─── Configuration ────────────────────────────────────────────────────────────

const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org';
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || '0x000000000000000000000000000000000000dEaD';
const X402_NETWORK = process.env.X402_NETWORK || 'eip155:84532'; // Base Sepolia
const X402_ENABLED = process.env.X402_ENABLED !== 'false'; // enabled by default

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentRouteConfig {
  /** Human-readable description */
  description: string;
  /** Price in dollars, e.g. "$0.01" */
  price: string;
  /** Address that receives payment */
  payTo?: string;
  /** Max seconds for the payment to remain valid */
  maxTimeoutSeconds?: number;
  /** MIME type of the response */
  mimeType?: string;
}

export interface PaymentRequirements {
  x402Version: number;
  scheme: string;
  network: string;
  payTo: string;
  maxTimeoutSeconds: number;
  description: string;
  mimeType: string;
  price: string;
  resource: string;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
}

export interface SettleResponse {
  success: boolean;
  transaction?: string;
  network?: string;
  error?: string;
}

// In-memory payment log
interface PaymentRecord {
  id: string;
  route: string;
  payerAddress: string;
  amount: string;
  network: string;
  txHash: string | null;
  settledAt: string;
  status: 'verified' | 'settled' | 'failed';
}

const paymentLog: PaymentRecord[] = [];

// ─── Facilitator Client ───────────────────────────────────────────────────────

/**
 * Lightweight HTTP client for the x402 facilitator server.
 * Handles /verify and /settle RPCs.
 */
class FacilitatorClient {
  constructor(private url: string) {}

  async verify(paymentPayload: unknown, paymentRequirements: unknown): Promise<VerifyResponse> {
    try {
      const res = await fetch(`${this.url}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentPayload, paymentRequirements }),
      });

      if (!res.ok) {
        return { isValid: false, invalidReason: `Facilitator returned ${res.status}` };
      }

      return await res.json() as VerifyResponse;
    } catch (err: any) {
      console.error('[x402] Facilitator verify error:', err.message);
      return { isValid: false, invalidReason: err.message };
    }
  }

  async settle(paymentPayload: unknown, paymentRequirements: unknown): Promise<SettleResponse> {
    try {
      const res = await fetch(`${this.url}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentPayload, paymentRequirements }),
      });

      if (!res.ok) {
        return { success: false, error: `Facilitator returned ${res.status}` };
      }

      return await res.json() as SettleResponse;
    } catch (err: any) {
      console.error('[x402] Facilitator settle error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

const facilitator = new FacilitatorClient(FACILITATOR_URL);

// ─── Route Registry ───────────────────────────────────────────────────────────

/**
 * Registry of routes that require x402 payment.
 * Keys are "METHOD /path" (e.g. "POST /repositories/:repoId/bounties").
 */
const protectedRoutes = new Map<string, PaymentRouteConfig>();

/**
 * Register a route as requiring x402 payment.
 */
export function registerPaymentRoute(method: string, path: string, config: PaymentRouteConfig): void {
  const key = `${method.toUpperCase()} ${path}`;
  protectedRoutes.set(key, config);
  console.log(`[x402] Registered payment route: ${key} → ${config.price}`);
}

/**
 * Check if a given method+path matches any registered payment route.
 * Supports :param style path matching.
 */
function matchRoute(method: string, path: string): { key: string; config: PaymentRouteConfig } | null {
  const reqMethod = method.toUpperCase();

  for (const [key, config] of protectedRoutes) {
    const [routeMethod, routePath] = key.split(' ', 2);
    if (routeMethod !== reqMethod) continue;

    // Convert route pattern to regex (replace :param with [^/]+)
    const pattern = routePath.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);

    if (regex.test(path)) {
      return { key, config };
    }
  }

  return null;
}

// ─── Payment Header Encoding/Decoding ─────────────────────────────────────────

function encodeBase64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

function decodeBase64(str: string): unknown {
  try {
    return JSON.parse(Buffer.from(str, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

// ─── Fastify Plugin ───────────────────────────────────────────────────────────

/**
 * Fastify plugin that intercepts requests to payment-gated routes.
 *
 * If a request hits a registered route without a valid PAYMENT-SIGNATURE
 * header, it returns HTTP 402 with payment requirements in the
 * PAYMENT-REQUIRED header.
 *
 * If a valid PAYMENT-SIGNATURE is present, it verifies via the facilitator,
 * allows the request through, and then settles the payment asynchronously.
 */
export async function x402PaymentPlugin(app: FastifyInstance): Promise<void> {
  if (!X402_ENABLED) {
    console.log('[x402] Payment middleware disabled (X402_ENABLED=false)');
    return;
  }

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const match = matchRoute(request.method, request.url.split('?')[0]);
    if (!match) return; // Not a payment-gated route

    const { key, config } = match;
    const paymentSignature = request.headers['payment-signature'] as string | undefined;

    // ── No payment header → 402 ──
    if (!paymentSignature) {
      const requirements: PaymentRequirements = {
        x402Version: 2,
        scheme: 'exact',
        network: X402_NETWORK,
        payTo: config.payTo || TREASURY_ADDRESS,
        maxTimeoutSeconds: config.maxTimeoutSeconds || 60,
        description: config.description,
        mimeType: config.mimeType || 'application/json',
        price: config.price,
        resource: request.url,
      };

      reply
        .code(402)
        .header('PAYMENT-REQUIRED', encodeBase64(requirements))
        .send({
          error: 'Payment Required',
          x402Version: 2,
          accepts: [
            {
              scheme: 'exact',
              network: X402_NETWORK,
              price: config.price,
              payTo: config.payTo || TREASURY_ADDRESS,
              maxTimeoutSeconds: config.maxTimeoutSeconds || 60,
            },
          ],
          description: config.description,
          resource: request.url,
        });
      return;
    }

    // ── Payment header present → verify ──
    const paymentPayload = decodeBase64(paymentSignature);
    if (!paymentPayload) {
      reply.code(400).send({ error: 'Malformed PAYMENT-SIGNATURE header' });
      return;
    }

    const paymentRequirements = {
      scheme: 'exact',
      network: X402_NETWORK,
      payTo: config.payTo || TREASURY_ADDRESS,
      maxTimeoutSeconds: config.maxTimeoutSeconds || 60,
    };

    const verification = await facilitator.verify(paymentPayload, paymentRequirements);

    if (!verification.isValid) {
      reply.code(402).send({
        error: 'Payment verification failed',
        reason: verification.invalidReason,
      });
      return;
    }

    // ── Verified — allow request through ──
    // Attach payment info to request for downstream handlers
    (request as any).x402Payment = {
      verified: true,
      payload: paymentPayload,
      requirements: paymentRequirements,
      route: key,
    };

    // ── Settle asynchronously after response is sent ──
    reply.raw.on('finish', () => {
      facilitator.settle(paymentPayload, paymentRequirements).then((result) => {
        const record: PaymentRecord = {
          id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          route: key,
          payerAddress: (paymentPayload as any)?.payload?.authorization?.from || 'unknown',
          amount: config.price,
          network: X402_NETWORK,
          txHash: result.transaction || null,
          settledAt: new Date().toISOString(),
          status: result.success ? 'settled' : 'failed',
        };
        paymentLog.push(record);

        if (result.success) {
          console.log(`[x402] Payment settled: ${record.id} tx=${result.transaction}`);
        } else {
          console.error(`[x402] Settlement failed for ${record.id}: ${result.error}`);
        }
      }).catch((err: any) => {
        console.error('[x402] Settlement error:', err.message);
      });
    });
  });

  console.log(`[x402] Payment middleware active — facilitator: ${FACILITATOR_URL}`);
}

// ─── Fastify Routes ───────────────────────────────────────────────────────────

/**
 * x402 payment status and management routes.
 */
export async function x402Routes(app: FastifyInstance): Promise<void> {
  // GET /x402/config — Public config for x402 payment
  app.get('/config', async () => ({
    enabled: X402_ENABLED,
    facilitator: FACILITATOR_URL,
    network: X402_NETWORK,
    treasury: TREASURY_ADDRESS,
    protectedRoutes: Array.from(protectedRoutes.entries()).map(([key, config]) => ({
      route: key,
      price: config.price,
      description: config.description,
    })),
  }));

  // GET /x402/payments — Recent payment log (admin)
  app.get('/payments', async (request) => {
    return {
      total: paymentLog.length,
      payments: paymentLog.slice(-50).reverse(),
    };
  });

  // GET /x402/payments/stats — Payment statistics
  app.get('/payments/stats', async () => {
    const settled = paymentLog.filter((p) => p.status === 'settled');
    const failed = paymentLog.filter((p) => p.status === 'failed');

    // Group by route
    const byRoute = new Map<string, number>();
    for (const p of settled) {
      byRoute.set(p.route, (byRoute.get(p.route) || 0) + 1);
    }

    return {
      totalPayments: paymentLog.length,
      settled: settled.length,
      failed: failed.length,
      byRoute: Object.fromEntries(byRoute),
    };
  });
}

// ─── Default Payment Routes ───────────────────────────────────────────────────

/**
 * Register default payment-gated routes for AgentBranch.
 * Called during server startup to gate bounty and premium endpoints.
 */
export function registerDefaultPaymentRoutes(): void {
  // Posting a bounty on an issue costs $0.01 in x402 payment
  registerPaymentRoute('POST', '/repositories/:repoId/issues/:issueId/bounty', {
    description: 'Post a bounty on an issue (requires x402 micropayment)',
    price: '$0.01',
    maxTimeoutSeconds: 120,
  });

  // Submitting to a bounty costs $0.001
  registerPaymentRoute('POST', '/repositories/:repoId/issues/:issueId/bounty/submit', {
    description: 'Submit a solution to a bounty (requires x402 micropayment)',
    price: '$0.001',
    maxTimeoutSeconds: 60,
  });

  // Creating a pull request costs $0.005
  registerPaymentRoute('POST', '/repositories/:repoId/pulls', {
    description: 'Create a pull request (requires x402 micropayment)',
    price: '$0.005',
    maxTimeoutSeconds: 120,
  });

  console.log('[x402] Default payment routes registered');
}

// ─── Client Helpers ───────────────────────────────────────────────────────────

/**
 * Create an x402 payment-enabled fetch function for agent-to-agent requests.
 *
 * Uses @x402/fetch + @x402/evm to automatically handle 402 responses.
 * This is used by agents when calling other agents' payment-gated endpoints.
 *
 * Requires `viem` to be installed for account creation.
 * All imports are dynamic to avoid top-level failures.
 *
 * @param privateKey - The agent's EVM private key (hex with 0x prefix)
 * @returns A fetch-like function that handles x402 payments automatically
 */
export async function createPaymentFetch(privateKey: string): Promise<typeof fetch> {
  try {
    // Dynamic imports to avoid top-level failures if packages not present
    // Use require() for packages without proper ESM type declarations
    const x402Fetch = require('@x402/fetch') as any;
    const x402Evm = require('@x402/evm') as any;

    // viem account creation for signing
    const viem = require('viem/accounts') as any;
    const account = viem.privateKeyToAccount(privateKey as `0x${string}`);

    const paymentFetch = x402Fetch.wrapFetchWithPaymentFromConfig(fetch, {
      schemes: [
        {
          network: X402_NETWORK,
          client: new x402Evm.ExactEvmScheme(account),
        },
      ],
    });

    return paymentFetch as typeof fetch;
  } catch (err: any) {
    console.warn('[x402] Could not create payment fetch (missing deps?):', err.message);
    // Fallback: return plain fetch
    return fetch;
  }
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function isX402Enabled(): boolean {
  return X402_ENABLED;
}

export function getX402Config() {
  return {
    enabled: X402_ENABLED,
    facilitator: FACILITATOR_URL,
    network: X402_NETWORK,
    treasury: TREASURY_ADDRESS,
    protectedRouteCount: protectedRoutes.size,
  };
}
