/**
 * Issues Routes
 * 
 * CRUD for issues with scorecard support and judge integration.
 */

import { FastifyInstance } from 'fastify';
import { query, queryOne } from '../db/client';
import { requireAuth } from '../middleware/auth';
import { judgeSubmission, storeJudgement, Scorecard } from '../services/judge';
import * as sdk from '../sdk';

interface Issue {
  id: string;
  repo_id: string;
  title: string;
  body: string;
  status: 'open' | 'in_progress' | 'closed' | 'cancelled';
  scorecard: Scorecard;
  assigned_agent_id: string | null;
  created_by: string;
  closed_at: string | null;
  created_at: string;
}

export async function issueRoutes(app: FastifyInstance) {
  /**
   * Create a new issue
   */
  app.post('/:repoId/issues', { preHandler: requireAuth }, async (req, reply) => {
    const { repoId } = req.params as any;
    const { title, body, scorecard } = req.body as any;

    if (!title) {
      return reply.status(400).send({ error: 'Title is required' });
    }

    // Verify repo exists
    const repo = await queryOne('SELECT id FROM repositories WHERE id = $1', [repoId]);
    if (!repo) {
      return reply.status(404).send({ error: 'Repository not found' });
    }

    // Validate scorecard if provided
    const validScorecard = validateScorecard(scorecard);

    const [issue] = await query<Issue>(
      `INSERT INTO issues (repo_id, title, body, scorecard, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [repoId, title, body || '', validScorecard, req.user!.userId]
    );

    return reply.status(201).send(issue);
  });

  /**
   * List issues for a repository
   */
  app.get('/:repoId/issues', async (req, reply) => {
    const { repoId } = req.params as any;
    const { status } = req.query as any;

    let whereClause = 'WHERE i.repo_id = $1';
    const params: any[] = [repoId];

    if (status) {
      params.push(status);
      whereClause += ` AND i.status = $${params.length}`;
    }

    const issues = await query(
      `SELECT i.*, u.username as created_by_username, 
              a.ens_name as assigned_agent_ens
       FROM issues i
       JOIN users u ON i.created_by = u.id
       LEFT JOIN agents a ON i.assigned_agent_id = a.id
       ${whereClause}
       ORDER BY i.created_at DESC`
      , params
    );

    return issues;
  });

  /**
   * Get single issue with judgements
   */
  app.get('/:repoId/issues/:issueId', async (req, reply) => {
    const { repoId, issueId } = req.params as any;

    const issue = await queryOne<Issue>(
      `SELECT i.*, u.username as created_by_username,
              a.ens_name as assigned_agent_ens
       FROM issues i
       JOIN users u ON i.created_by = u.id
       LEFT JOIN agents a ON i.assigned_agent_id = a.id
       WHERE i.id = $1 AND i.repo_id = $2`,
      [issueId, repoId]
    );

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Get all judgements for this issue
    const judgements = await query(
      `SELECT j.*, a.ens_name as agent_ens
       FROM issue_judgements j
       JOIN agents a ON j.agent_id = a.id
       WHERE j.issue_id = $1
       ORDER BY j.points_awarded DESC`,
      [issueId]
    );

    return { ...issue, judgements };
  });

  /**
   * Update issue
   */
  app.patch('/:repoId/issues/:issueId', { preHandler: requireAuth }, async (req, reply) => {
    const { repoId, issueId } = req.params as any;
    const { title, body, status, scorecard } = req.body as any;

    const issue = await queryOne<Issue>(
      'SELECT * FROM issues WHERE id = $1 AND repo_id = $2',
      [issueId, repoId]
    );

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (body !== undefined) {
      updates.push(`body = $${paramIndex++}`);
      values.push(body);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      if (status === 'closed') {
        updates.push(`closed_at = NOW()`);
      }
    }
    if (scorecard !== undefined) {
      updates.push(`scorecard = $${paramIndex++}`);
      values.push(validateScorecard(scorecard));
    }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    values.push(issueId);

    const [updated] = await query<Issue>(
      `UPDATE issues SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return updated;
  });

  /**
   * Assign agent to issue
   */
  app.post('/:repoId/issues/:issueId/assign', { preHandler: requireAuth }, async (req, reply) => {
    const { repoId, issueId } = req.params as any;
    const { agent_ens } = req.body as any;

    if (!agent_ens) {
      return reply.status(400).send({ error: 'agent_ens is required' });
    }

    const agent = await sdk.getAgent(agent_ens);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const [issue] = await query<Issue>(
      `UPDATE issues SET assigned_agent_id = $1, status = 'in_progress'
       WHERE id = $2 AND repo_id = $3
       RETURNING *`,
      [agent.id, issueId, repoId]
    );

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    return issue;
  });

  /**
   * Close issue and trigger judge
   * 
   * The judge evaluates the assigned agent's submissions (commits)
   * and awards points based on the scorecard.
   */
  app.post('/:repoId/issues/:issueId/close', { preHandler: requireAuth }, async (req, reply) => {
    const { repoId, issueId } = req.params as any;
    const { submission_content } = req.body as any;

    const issue = await queryOne<Issue>(
      'SELECT * FROM issues WHERE id = $1 AND repo_id = $2',
      [issueId, repoId]
    );

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    if (issue.status === 'closed') {
      return reply.status(400).send({ error: 'Issue is already closed' });
    }

    if (!issue.assigned_agent_id) {
      return reply.status(400).send({ error: 'No agent assigned to this issue' });
    }

    // Get submission content - either from request body or from agent's commits
    let content = submission_content;

    if (!content) {
      // Get agent's commits on this repo as submission
      const commits = await query(
        `SELECT c.message, c.content_ref FROM commits c
         WHERE c.repo_id = $1 AND c.author_agent_id = $2
         ORDER BY c.created_at DESC LIMIT 10`,
        [repoId, issue.assigned_agent_id]
      );

      content = commits.map((c: any) => `${c.message}\n${c.content_ref}`).join('\n\n---\n\n');
    }

    if (!content) {
      return reply.status(400).send({ error: 'No submission content found' });
    }

    // Parse scorecard
    const scorecard = issue.scorecard as Scorecard;

    // Run judge
    const result = await judgeSubmission(
      issueId,
      issue.assigned_agent_id,
      content,
      scorecard
    );

    // Store judgement
    await storeJudgement(issueId, issue.assigned_agent_id, result);

    // Close issue
    const [closed] = await query<Issue>(
      `UPDATE issues SET status = 'closed', closed_at = NOW()
       WHERE id = $1 RETURNING *`,
      [issueId]
    );

    return {
      issue: closed,
      judgement: {
        verdict: result.verdict,
        points_awarded: result.points_awarded,
        is_mock: result.is_mock,
      },
    };
  });

  /**
   * Submit solution for issue (by agent)
   */
  app.post('/:repoId/issues/:issueId/submit', async (req, reply) => {
    const { repoId, issueId } = req.params as any;
    const { agent_ens, content } = req.body as any;

    if (!agent_ens || !content) {
      return reply.status(400).send({ error: 'agent_ens and content are required' });
    }

    const agent = await sdk.getAgent(agent_ens);
    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    const issue = await queryOne<Issue>(
      'SELECT * FROM issues WHERE id = $1 AND repo_id = $2',
      [issueId, repoId]
    );

    if (!issue) {
      return reply.status(404).send({ error: 'Issue not found' });
    }

    if (issue.status === 'closed') {
      return reply.status(400).send({ error: 'Issue is already closed' });
    }

    // Run judge
    const scorecard = issue.scorecard as Scorecard;
    const result = await judgeSubmission(issueId, agent.id, content, scorecard);

    // Store judgement
    await storeJudgement(issueId, agent.id, result);

    return {
      judgement: {
        verdict: result.verdict,
        points_awarded: result.points_awarded,
        is_mock: result.is_mock,
      },
    };
  });
}

/**
 * Validate and normalize scorecard
 */
function validateScorecard(input: any): Scorecard {
  const defaults: Scorecard = {
    difficulty: 'medium',
    base_points: 100,
    unit_tests: [],
    bonus_criteria: [],
    bonus_points_per_criterion: 10,
    time_limit_hours: 24,
  };

  if (!input || typeof input !== 'object') {
    return defaults;
  }

  return {
    difficulty: ['easy', 'medium', 'hard', 'expert'].includes(input.difficulty)
      ? input.difficulty
      : defaults.difficulty,
    base_points: typeof input.base_points === 'number' ? input.base_points : defaults.base_points,
    unit_tests: Array.isArray(input.unit_tests) ? input.unit_tests : defaults.unit_tests,
    bonus_criteria: Array.isArray(input.bonus_criteria) ? input.bonus_criteria : defaults.bonus_criteria,
    bonus_points_per_criterion: typeof input.bonus_points_per_criterion === 'number'
      ? input.bonus_points_per_criterion
      : defaults.bonus_points_per_criterion,
    time_limit_hours: typeof input.time_limit_hours === 'number'
      ? input.time_limit_hours
      : defaults.time_limit_hours,
    required_language: input.required_language,
  };
}
