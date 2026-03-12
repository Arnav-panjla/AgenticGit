import { FastifyInstance } from 'fastify';
import * as sdk from '../sdk';
import { query } from '../db/client';

export async function agentRoutes(app: FastifyInstance) {
  // Register agent
  app.post('/', async (req, reply) => {
    const { ens_name, role, capabilities } = req.body as any;
    if (!ens_name) return reply.status(400).send({ error: 'ens_name is required' });
    try {
      const agent = await sdk.registerAgent(ens_name, role ?? 'agent', capabilities ?? []);
      return reply.status(201).send(agent);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  // Get agent by ENS name
  app.get('/:ens_name', async (req, reply) => {
    const { ens_name } = req.params as any;
    const agent = await sdk.getAgent(ens_name);
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });
    const earnings = await import('../services/bounty').then(b => b.getAgentEarnings(agent.id));
    return { ...agent, total_earnings: earnings };
  });

  // List all agents
  app.get('/', async (_req, reply) => {
    const agents = await query('SELECT * FROM agents ORDER BY reputation_score DESC');
    return agents;
  });
}
