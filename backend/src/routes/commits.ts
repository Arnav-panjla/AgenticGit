/**
 * Commit Routes (v3)
 * 
 * Includes semantic search, reasoning graph, replay trace, and
 * knowledge context handoff endpoints for multi-agent collaboration.
 */

import { FastifyInstance } from 'fastify';
import * as sdk from '../sdk';
import { CommitOptions } from '../sdk';

export async function commitRoutes(app: FastifyInstance) {
  /**
   * Commit memory (v3 - with semantic features + knowledge context)
   */
  app.post('/:repoId/commits', async (req, reply) => {
    const { repoId } = req.params as any;
    const {
      branch,
      content,
      message,
      author_ens,
      content_type,
      reasoning_type,
      trace,
      skip_semantics,
      knowledge_context,
    } = req.body as any;

    if (!branch || !content || !message || !author_ens) {
      return reply.status(400).send({
        error: 'branch, content, message, and author_ens are required',
      });
    }

    // Build commit options
    const options: CommitOptions = {
      contentType: content_type ?? 'text',
      reasoningType: reasoning_type,
      skipSemantics: skip_semantics ?? false,
    };

    // Parse trace data if provided
    if (trace) {
      options.trace = {
        prompt: trace.prompt || '',
        context: trace.context || {},
        tools: trace.tools || [],
        result: trace.result || '',
      };
    }

    // Parse knowledge context if provided
    if (knowledge_context) {
      options.knowledgeContext = {
        decisions: knowledge_context.decisions || [],
        architecture: knowledge_context.architecture || undefined,
        libraries: knowledge_context.libraries || [],
        open_questions: knowledge_context.open_questions || [],
        next_steps: knowledge_context.next_steps || [],
        dependencies: knowledge_context.dependencies || [],
        handoff_summary: knowledge_context.handoff_summary || undefined,
      };
    }

    try {
      const commit = await sdk.commitMemory(repoId, branch, content, message, author_ens, options);
      return reply.status(201).send(commit);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * Read memory (permission-filtered)
   */
  app.get('/:repoId/commits', async (req, reply) => {
    const { repoId } = req.params as any;
    const { agent_ens, branch } = req.query as any;

    if (!agent_ens) {
      return reply.status(400).send({ error: 'agent_ens query param is required' });
    }

    try {
      const commits = await sdk.readMemory(repoId, agent_ens, branch);
      return commits;
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * Semantic search commits
   */
  app.get('/:repoId/commits/search', async (req, reply) => {
    const { repoId } = req.params as any;
    const { q, limit } = req.query as any;

    if (!q) {
      return reply.status(400).send({ error: 'q query param is required' });
    }

    try {
      const results = await sdk.searchCommits(repoId, q, parseInt(limit) || 10);
      return results;
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * Get reasoning graph for repository
   */
  app.get('/:repoId/commits/graph', async (req, reply) => {
    const { repoId } = req.params as any;
    const { root } = req.query as any;

    try {
      const graph = await sdk.getCommitGraph(repoId, root);
      return graph;
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * Get single commit with replay trace
   */
  app.get('/:repoId/commits/:commitId', async (req, reply) => {
    const { commitId } = req.params as any;

    try {
      const result = await sdk.getCommitReplay(commitId);
      return result;
    } catch (e: any) {
      if (e.message.includes('not found')) {
        return reply.status(404).send({ error: e.message });
      }
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * Get replay trace for a commit
   */
  app.get('/:repoId/commits/:commitId/replay', async (req, reply) => {
    const { commitId } = req.params as any;

    try {
      const result = await sdk.getCommitReplay(commitId);
      return {
        commit_id: result.commit.id,
        message: result.commit.message,
        reasoning_type: result.commit.reasoning_type,
        trace: result.trace,
        reasoning_chain: result.reasoningChain.map(c => ({
          id: c.id,
          message: c.message,
          reasoning_type: c.reasoning_type,
          author_ens: c.author_ens,
          created_at: c.created_at,
        })),
      };
    } catch (e: any) {
      if (e.message.includes('not found')) {
        return reply.status(404).send({ error: e.message });
      }
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * Get context chain for a repository (v3)
   * Shows all commits grouped by agent handoffs — how agents build on each other's work.
   */
  app.get('/:repoId/context-chain', async (req, reply) => {
    const { repoId } = req.params as any;
    const { branch } = req.query as any;

    try {
      const chain = await sdk.getContextChain(repoId, branch);
      return chain;
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });
}
