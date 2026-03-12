import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';

import { agentRoutes } from './routes/agents';
import { repositoryRoutes } from './routes/repositories';
import { branchRoutes } from './routes/branches';
import { commitRoutes } from './routes/commits';
import { pullRequestRoutes } from './routes/pullrequests';
import { permissionRoutes } from './routes/permissions';

dotenv.config();

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, { origin: true });

  // Routes
  await app.register(agentRoutes, { prefix: '/agents' });
  await app.register(repositoryRoutes, { prefix: '/repositories' });
  await app.register(branchRoutes, { prefix: '/repositories' });
  await app.register(commitRoutes, { prefix: '/repositories' });
  await app.register(pullRequestRoutes, { prefix: '/repositories' });
  await app.register(permissionRoutes, { prefix: '/repositories' });

  // Health check
  app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`AgentBranch API running on http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
