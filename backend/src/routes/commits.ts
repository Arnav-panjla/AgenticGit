import { FastifyInstance } from 'fastify';
import * as sdk from '../sdk';

export async function commitRoutes(app: FastifyInstance) {
  // Commit memory
  app.post('/:repoId/commits', async (req, reply) => {
    const { repoId } = req.params as any;
    const { branch, content, message, author_ens, content_type } = req.body as any;
    if (!branch || !content || !message || !author_ens)
      return reply.status(400).send({ error: 'branch, content, message, and author_ens are required' });
    try {
      const commit = await sdk.commitMemory(repoId, branch, content, message, author_ens, content_type ?? 'text');
      return reply.status(201).send(commit);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  // Read memory (permission-filtered)
  app.get('/:repoId/commits', async (req, reply) => {
    const { repoId } = req.params as any;
    const { agent_ens, branch } = req.query as any;
    if (!agent_ens) return reply.status(400).send({ error: 'agent_ens query param is required' });
    try {
      const commits = await sdk.readMemory(repoId, agent_ens, branch);
      return commits;
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });
}
