/**
 * Leaderboard Routes Tests
 */

import Fastify, { FastifyInstance } from 'fastify';
import { leaderboardRoutes } from '../routes/leaderboard';

// Mock database
jest.mock('../db/client', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  pool: { end: jest.fn() },
}));

import { query } from '../db/client';

describe('Leaderboard Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(leaderboardRoutes, { prefix: '/leaderboard' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /leaderboard', () => {
    it('should return ranked leaderboard entries', async () => {
      const mockEntries = [
        {
          rank: '1',
          agent_id: 'agent-1',
          ens_name: 'topagent.eth',
          role: 'researcher',
          reputation_score: 150,
          total_points: '500',
          issues_completed: '10',
          deposit_verified: true,
        },
        {
          rank: '2',
          agent_id: 'agent-2',
          ens_name: 'secondagent.eth',
          role: 'developer',
          reputation_score: 120,
          total_points: '350',
          issues_completed: '7',
          deposit_verified: true,
        },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce(mockEntries) // leaderboard query
        .mockResolvedValueOnce([{ count: '25' }]); // count query

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entries).toHaveLength(2);
      expect(body.entries[0].ens_name).toBe('topagent.eth');
      expect(body.pagination.total).toBe(25);
      expect(body.timeframe).toBe('all');
    });

    it('should respect limit parameter', async () => {
      const mockEntries = [
        { rank: '1', agent_id: 'agent-1', total_points: '500' },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce(mockEntries)
        .mockResolvedValueOnce([{ count: '100' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?limit=1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entries).toHaveLength(1);
      expect(body.pagination.limit).toBe(1);
      expect(body.pagination.hasMore).toBe(true);
    });

    it('should enforce max limit of 100', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?limit=500',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.limit).toBe(100);
    });

    it('should support pagination with offset', async () => {
      const mockEntries = [
        { rank: '11', agent_id: 'agent-11', total_points: '100' },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce(mockEntries)
        .mockResolvedValueOnce([{ count: '50' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?limit=10&offset=10',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.offset).toBe(10);
    });

    it('should filter by week timeframe', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?timeframe=week',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.timeframe).toBe('week');
    });

    it('should filter by month timeframe', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?timeframe=month',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.timeframe).toBe('month');
    });
  });

  describe('GET /leaderboard/stats', () => {
    it('should return platform stats', async () => {
      (query as jest.Mock).mockResolvedValue([{
        total_agents: '42',
        total_points: '15000',
        total_issues: '120',
        issues_closed: '95',
      }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total_agents).toBe(42);
      expect(body.total_points).toBe(15000);
      expect(body.total_issues).toBe(120);
      expect(body.issues_closed).toBe(95);
    });

    it('should return zeros when no data', async () => {
      (query as jest.Mock).mockResolvedValue([{
        total_agents: '0',
        total_points: '0',
        total_issues: '0',
        issues_closed: '0',
      }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total_agents).toBe(0);
      expect(body.total_points).toBe(0);
    });
  });

  describe('GET /leaderboard/agents/:ensName', () => {
    it('should return agent profile with stats', async () => {
      const mockAgent = {
        id: 'agent-123',
        ens_name: 'topagent.eth',
        role: 'researcher',
        reputation_score: 150,
        deposit_verified: true,
        total_points: '500',
        issues_completed: '10',
      };
      const mockRank = { rank: '1' };
      const mockJudgements = [
        {
          id: 'j-1',
          points_awarded: 100,
          issue_title: 'Issue 1',
          repo_name: 'repo-1',
        },
      ];
      const mockContributions = [
        {
          id: 'repo-1',
          name: 'research-repo',
          commit_count: '25',
          pr_count: '5',
        },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce([mockAgent]) // agent query
        .mockResolvedValueOnce([mockRank]) // rank query
        .mockResolvedValueOnce(mockJudgements) // judgements query
        .mockResolvedValueOnce(mockContributions); // contributions query

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/agents/topagent.eth',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ens_name).toBe('topagent.eth');
      expect(body.rank).toBe(1);
      expect(body.judgements).toHaveLength(1);
      expect(body.contributions).toHaveLength(1);
    });

    it('should return 404 if agent not found', async () => {
      (query as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/agents/nonexistent.eth',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should handle agent with no judgements or contributions', async () => {
      const mockAgent = {
        id: 'agent-new',
        ens_name: 'newagent.eth',
        role: 'developer',
        reputation_score: 50,
        total_points: '0',
        issues_completed: '0',
      };

      (query as jest.Mock)
        .mockResolvedValueOnce([mockAgent])
        .mockResolvedValueOnce([{ rank: '42' }])
        .mockResolvedValueOnce([]) // no judgements
        .mockResolvedValueOnce([]); // no contributions

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/agents/newagent.eth',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ens_name).toBe('newagent.eth');
      expect(body.judgements).toHaveLength(0);
      expect(body.contributions).toHaveLength(0);
    });

    it('should handle missing rank gracefully', async () => {
      const mockAgent = {
        id: 'agent-123',
        ens_name: 'agent.eth',
      };

      (query as jest.Mock)
        .mockResolvedValueOnce([mockAgent])
        .mockResolvedValueOnce([]) // no rank result
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/agents/agent.eth',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.rank).toBe(0);
    });
  });
});
