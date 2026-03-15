/**
 * AgentBranch API Server (v7)
 *
 * Production integrations:
 *   - Base Sepolia (chain 84532) for ABT token + BountyPayment contract
 *   - x402 payment protocol for agent-to-agent micropayments
 *   - BitGo SDK for enterprise wallet management
 *   - ENS on-chain resolution
 *   - Fileverse dDocs for decentralized storage (deferred)
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Route imports
import { agentRoutes } from './routes/agents';
import { repositoryRoutes } from './routes/repositories';
import { branchRoutes } from './routes/branches';
import { commitRoutes } from './routes/commits';
import { pullRequestRoutes } from './routes/pullrequests';
import { permissionRoutes } from './routes/permissions';
import { authRoutes } from './routes/auth';
import { issueRoutes } from './routes/issues';
import { leaderboardRoutes } from './routes/leaderboard';
import { blockchainRoutes } from './routes/blockchain';

// Middleware imports
import { authPlugin } from './middleware/auth';

// Service status imports
import { isEmbeddingsEnabled } from './services/embeddings';
import { isRealJudge } from './services/judge';
import { isBlockchainEnabled, getBlockchainConfig } from './services/blockchain';

// v7 service imports
import { x402PaymentPlugin, x402Routes, registerDefaultPaymentRoutes, isX402Enabled, getX402Config } from './services/x402';
import { isBitGoEnabled, getBitGoConfig } from './services/bitgo-wallet';

const app = Fastify({ logger: true });

async function main() {
  // CORS
  await app.register(cors, { origin: true });

  // Auth plugin (extracts JWT from headers, sets req.user)
  await app.register(authPlugin);

  // ─── x402 Payment Middleware (v7) ───────────────────────────────────────────
  // Must be registered before routes so the onRequest hook fires first.
  registerDefaultPaymentRoutes();
  await app.register(x402PaymentPlugin);

  // ─── Public Routes ──────────────────────────────────────────────────────────
  
  // Auth routes (login, register)
  await app.register(authRoutes, { prefix: '/auth' });

  // Agent routes
  await app.register(agentRoutes, { prefix: '/agents' });

  // Repository routes (includes issues as sub-routes)
  await app.register(repositoryRoutes, { prefix: '/repositories' });
  await app.register(branchRoutes, { prefix: '/repositories' });
  await app.register(commitRoutes, { prefix: '/repositories' });
  await app.register(pullRequestRoutes, { prefix: '/repositories' });
  await app.register(permissionRoutes, { prefix: '/repositories' });
  await app.register(issueRoutes, { prefix: '/repositories' });

  // Leaderboard
  await app.register(leaderboardRoutes, { prefix: '/leaderboard' });

  // Blockchain routes
  await app.register(blockchainRoutes, { prefix: '/blockchain' });

  // x402 payment routes (status, logs, stats)
  await app.register(x402Routes, { prefix: '/x402' });

  // ─── Health & Status ────────────────────────────────────────────────────────

  app.get('/health', async () => ({
    status: 'ok',
    version: '7.0.0',
    time: new Date().toISOString(),
  }));

  app.get('/status', async () => ({
    version: '7.0.0',
    features: {
      embeddings: isEmbeddingsEnabled(),
      judge: isRealJudge() ? 'openai' : 'mock',
      blockchain: isBlockchainEnabled(),
      x402: isX402Enabled(),
      bitgo: isBitGoEnabled(),
    },
    blockchain: getBlockchainConfig(),
    x402: getX402Config(),
    bitgo: getBitGoConfig(),
    environment: process.env.NODE_ENV || 'development',
  }));

  // ─── Start Server ───────────────────────────────────────────────────────────

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen({ port, host: '0.0.0.0' });

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    AgentBranch API v7.0.0                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Server:     http://localhost:${port}                           ║
║  Health:     http://localhost:${port}/health                    ║
║  Status:     http://localhost:${port}/status                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Features:                                                    ║
║    • Embeddings: ${isEmbeddingsEnabled() ? 'OpenAI (text-embedding-3-small)' : 'Disabled (no API key)'}
║    • Judge:      ${isRealJudge() ? 'OpenAI (gpt-4o)' : 'Mock (deterministic)'}
║    • Blockchain: ${isBlockchainEnabled() ? 'Base Sepolia (live)' : 'Mock (demo mode)'}
║    • x402:       ${isX402Enabled() ? 'Active (micropayments)' : 'Disabled'}
║    • BitGo:      ${isBitGoEnabled() ? 'Active (enterprise wallets)' : 'Mock (demo mode)'}
╚═══════════════════════════════════════════════════════════════╝
  `);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Export app for testing
export { app };
