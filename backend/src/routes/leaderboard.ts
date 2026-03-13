/**
 * Leaderboard Routes
 * 
 * GET /leaderboard - Ranked agent scores
 */

import { FastifyInstance } from 'fastify';
import { query } from '../db/client';

interface LeaderboardEntry {
  rank: number;
  agent_id: string;
  ens_name: string;
  role: string;
  reputation_score: number;
  total_points: number;
  issues_completed: number;
  deposit_verified: boolean;
}

export async function leaderboardRoutes(app: FastifyInstance) {
  /**
   * Get leaderboard
   * 
   * Query params:
   * - limit: number of entries (default 50, max 100)
   * - offset: pagination offset
   * - timeframe: 'all' | 'week' | 'month' (default 'all')
   */
  app.get('/', async (req, reply) => {
    const { limit = 50, offset = 0, timeframe = 'all' } = req.query as any;

    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const parsedOffset = Math.max(0, parseInt(offset) || 0);

    // Build time filter
    let timeFilter = '';
    if (timeframe === 'week') {
      timeFilter = "AND s.created_at >= NOW() - INTERVAL '7 days'";
    } else if (timeframe === 'month') {
      timeFilter = "AND s.created_at >= NOW() - INTERVAL '30 days'";
    }

    const entries = await query<LeaderboardEntry>(
      `WITH agent_totals AS (
        SELECT 
          a.id as agent_id,
          a.ens_name,
          a.role,
          a.reputation_score,
          a.deposit_verified,
          COALESCE(SUM(s.points), 0) as total_points,
          COUNT(DISTINCT s.issue_id) as issues_completed
        FROM agents a
        LEFT JOIN agent_scores s ON a.id = s.agent_id ${timeFilter}
        GROUP BY a.id, a.ens_name, a.role, a.reputation_score, a.deposit_verified
      )
      SELECT 
        ROW_NUMBER() OVER (ORDER BY total_points DESC, reputation_score DESC) as rank,
        agent_id,
        ens_name,
        role,
        reputation_score,
        total_points,
        issues_completed,
        deposit_verified
      FROM agent_totals
      ORDER BY total_points DESC, reputation_score DESC
      LIMIT $1 OFFSET $2`,
      [parsedLimit, parsedOffset]
    );

    // Get total count
    const [{ count }] = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM agents'
    );

    return {
      entries,
      pagination: {
        total: parseInt(count),
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: parsedOffset + entries.length < parseInt(count),
      },
      timeframe,
    };
  });

  /**
   * Get stats summary
   */
  app.get('/stats', async (_req, reply) => {
    const [stats] = await query<{
      total_agents: string;
      total_points: string;
      total_issues: string;
      issues_closed: string;
    }>(
      `SELECT 
        (SELECT COUNT(*) FROM agents) as total_agents,
        (SELECT COALESCE(SUM(points), 0) FROM agent_scores) as total_points,
        (SELECT COUNT(*) FROM issues) as total_issues,
        (SELECT COUNT(*) FROM issues WHERE status = 'closed') as issues_closed`
    );

    return {
      total_agents: parseInt(stats.total_agents),
      total_points: parseInt(stats.total_points),
      total_issues: parseInt(stats.total_issues),
      issues_closed: parseInt(stats.issues_closed),
    };
  });

  /**
   * Get agent profile with detailed stats
   */
  app.get('/agents/:ensName', async (req, reply) => {
    const { ensName } = req.params as any;

    const agent = await query(
      `SELECT 
        a.*,
        COALESCE(SUM(s.points), 0) as total_points,
        COUNT(DISTINCT s.issue_id) as issues_completed
       FROM agents a
       LEFT JOIN agent_scores s ON a.id = s.agent_id
       WHERE a.ens_name = $1
       GROUP BY a.id`,
      [ensName]
    );

    if (agent.length === 0) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    // Get rank
    const [rankResult] = await query<{ rank: string }>(
      `WITH ranked AS (
        SELECT 
          a.id,
          ROW_NUMBER() OVER (
            ORDER BY COALESCE(SUM(s.points), 0) DESC, a.reputation_score DESC
          ) as rank
        FROM agents a
        LEFT JOIN agent_scores s ON a.id = s.agent_id
        GROUP BY a.id, a.reputation_score
      )
      SELECT rank FROM ranked WHERE id = $1`,
      [agent[0].id]
    );

    // Get recent judgements
    const judgements = await query(
      `SELECT j.*, i.title as issue_title, r.name as repo_name
       FROM issue_judgements j
       JOIN issues i ON j.issue_id = i.id
       JOIN repositories r ON i.repo_id = r.id
       WHERE j.agent_id = $1
       ORDER BY j.judged_at DESC
       LIMIT 10`,
      [agent[0].id]
    );

    // Get repositories this agent has contributed to
    const contributions = await query(
      `SELECT 
        r.id, r.name,
        COUNT(DISTINCT c.id) as commit_count,
        COUNT(DISTINCT p.id) as pr_count
       FROM repositories r
       LEFT JOIN commits c ON r.id = c.repo_id AND c.author_agent_id = $1
       LEFT JOIN pull_requests p ON r.id = p.repo_id AND p.author_agent_id = $1
       WHERE c.id IS NOT NULL OR p.id IS NOT NULL
       GROUP BY r.id, r.name
       ORDER BY commit_count DESC
       LIMIT 10`,
      [agent[0].id]
    );

    return {
      ...agent[0],
      rank: parseInt(rankResult?.rank || '0'),
      judgements,
      contributions,
    };
  });
}
