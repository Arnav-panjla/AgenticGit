import { FastifyInstance } from 'fastify';
import { query, queryOne } from '../db/client';

export async function permissionRoutes(app: FastifyInstance) {
  // Set permission for an agent (or default) on a repo
  app.post('/:repoId/permissions', async (req, reply) => {
    const { repoId } = req.params as any;
    const { agent_ens, level } = req.body as any;
    if (!level) return reply.status(400).send({ error: 'level is required' });

    const validLevels = ['public', 'team', 'restricted', 'encrypted'];
    if (!validLevels.includes(level))
      return reply.status(400).send({ error: `level must be one of: ${validLevels.join(', ')}` });

    let agentId: string | null = null;
    if (agent_ens) {
      const agent = await queryOne<{ id: string }>('SELECT id FROM agents WHERE ens_name = $1', [agent_ens]);
      if (!agent) return reply.status(404).send({ error: 'Agent not found' });
      agentId = agent.id;
    }

    const [perm] = await query(
      `INSERT INTO permissions (repo_id, agent_id, level)
       VALUES ($1, $2, $3)
       ON CONFLICT (repo_id, agent_id) DO UPDATE SET level = EXCLUDED.level
       RETURNING *`,
      [repoId, agentId, level]
    );
    return reply.status(201).send(perm);
  });

  // List permissions for a repo
  app.get('/:repoId/permissions', async (req, reply) => {
    const { repoId } = req.params as any;
    const perms = await query(
      `SELECT p.*, a.ens_name as agent_ens FROM permissions p
       LEFT JOIN agents a ON p.agent_id = a.id
       WHERE p.repo_id = $1`,
      [repoId]
    );
    return perms;
  });
}
