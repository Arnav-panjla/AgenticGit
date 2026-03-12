import { FastifyInstance } from 'fastify';
import * as sdk from '../sdk';
import { query, queryOne } from '../db/client';
import { getLedger } from '../services/bounty';
import { deposit } from '../services/bounty';

export async function repositoryRoutes(app: FastifyInstance) {
  // Create repository
  app.post('/', async (req, reply) => {
    const { name, owner_ens, description, initial_permission } = req.body as any;
    if (!name || !owner_ens) return reply.status(400).send({ error: 'name and owner_ens are required' });
    try {
      const repo = await sdk.createRepository(name, owner_ens, description ?? '', initial_permission ?? 'public');
      return reply.status(201).send(repo);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  // List all repositories (with owner ens + branch count)
  app.get('/', async (_req, reply) => {
    const repos = await query(
      `SELECT r.*, a.ens_name as owner_ens,
              (SELECT COUNT(*) FROM branches WHERE repo_id = r.id) as branch_count,
              (SELECT COUNT(*) FROM commits WHERE repo_id = r.id) as commit_count
       FROM repositories r
       JOIN agents a ON r.owner_agent_id = a.id
       ORDER BY r.created_at DESC`
    );
    return repos;
  });

  // Get single repository
  app.get('/:id', async (req, reply) => {
    const { id } = req.params as any;
    const repo = await queryOne(
      `SELECT r.*, a.ens_name as owner_ens FROM repositories r
       JOIN agents a ON r.owner_agent_id = a.id WHERE r.id = $1`,
      [id]
    );
    if (!repo) return reply.status(404).send({ error: 'Repository not found' });
    return repo;
  });

  // Deposit bounty into repo
  app.post('/:id/deposit', async (req, reply) => {
    const { id } = req.params as any;
    const { agent_ens, amount, note } = req.body as any;
    if (!agent_ens || !amount) return reply.status(400).send({ error: 'agent_ens and amount are required' });
    try {
      const agent = await sdk.getAgent(agent_ens);
      if (!agent) return reply.status(404).send({ error: 'Agent not found' });
      const entry = await deposit(id, agent.id, amount, note);
      return reply.status(201).send(entry);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  // Get bounty ledger for repo
  app.get('/:id/bounty', async (req, reply) => {
    const { id } = req.params as any;
    const ledger = await getLedger(id);
    return ledger;
  });
}
