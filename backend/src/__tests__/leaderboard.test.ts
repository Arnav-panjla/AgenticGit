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
        .mockResolvedValueOnce(mockContributions) // contributions query
        .mockResolvedValueOnce([{ academic_contribution: '0' }]); // v6: academic query

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
        .mockResolvedValueOnce([]) // no contributions
        .mockResolvedValueOnce([{ academic_contribution: '0' }]); // v6: academic query

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
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ academic_contribution: '0' }]); // v6: academic query

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/agents/agent.eth',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.rank).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // v6 Tests — Leaderboard Multi-Sort
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /leaderboard (v6 — sort_by & order)', () => {
    it('should sort by total_points desc by default', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sort_by).toBe('total_points');
      expect(body.order).toBe('desc');
    });

    it('should accept sort_by=reputation_score', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?sort_by=reputation_score&order=asc',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sort_by).toBe('reputation_score');
      expect(body.order).toBe('asc');
    });

    it('should accept sort_by=issues_completed', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?sort_by=issues_completed&order=desc',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sort_by).toBe('issues_completed');
    });

    it('should accept sort_by=code_quality', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?sort_by=code_quality',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sort_by).toBe('code_quality');
    });

    it('should accept sort_by=test_pass_rate', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?sort_by=test_pass_rate',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sort_by).toBe('test_pass_rate');
    });

    it('should accept sort_by=academic_contribution', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?sort_by=academic_contribution',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sort_by).toBe('academic_contribution');
    });

    it('should fallback to total_points for invalid sort_by', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?sort_by=invalid_column',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.sort_by).toBe('total_points');
    });

    it('should fallback to desc for invalid order', async () => {
      (query as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard?order=invalid',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.order).toBe('desc');
    });

    it('should return v6 fields in entries (code_quality, test_pass_rate, academic_contribution)', async () => {
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
          code_quality: '8.5',
          test_pass_rate: '9.2',
          academic_contribution: '7.0',
        },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce(mockEntries)
        .mockResolvedValueOnce([{ count: '1' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.entries[0]).toHaveProperty('code_quality');
      expect(body.entries[0]).toHaveProperty('test_pass_rate');
      expect(body.entries[0]).toHaveProperty('academic_contribution');
    });
  });

  describe('GET /leaderboard/stats (v6 — repository counts)', () => {
    it('should return total_repositories and academia_repositories', async () => {
      (query as jest.Mock).mockResolvedValue([{
        total_agents: '10',
        total_points: '5000',
        total_issues: '30',
        issues_closed: '25',
        total_repositories: '7',
        academia_repositories: '2',
      }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total_repositories).toBe(7);
      expect(body.academia_repositories).toBe(2);
    });

    it('should return zero academia repos when none exist', async () => {
      (query as jest.Mock).mockResolvedValue([{
        total_agents: '5',
        total_points: '1000',
        total_issues: '10',
        issues_closed: '8',
        total_repositories: '3',
        academia_repositories: '0',
      }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/stats',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total_repositories).toBe(3);
      expect(body.academia_repositories).toBe(0);
    });
  });

  describe('GET /leaderboard/agents/:ensName (v6 — academic contribution)', () => {
    it('should return academic_contribution in agent profile', async () => {
      const mockAgent = {
        id: 'agent-acad',
        ens_name: 'researcher.eth',
        role: 'researcher',
        reputation_score: 100,
        total_points: '250',
        issues_completed: '5',
      };
      const mockContributions = [
        {
          id: 'repo-1',
          name: 'ml-research',
          repo_type: 'academia',
          academia_field: 'ML',
          commit_count: '10',
          pr_count: '2',
        },
        {
          id: 'repo-2',
          name: 'general-repo',
          repo_type: 'general',
          academia_field: null,
          commit_count: '5',
          pr_count: '1',
        },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce([mockAgent]) // agent
        .mockResolvedValueOnce([{ rank: '3' }]) // rank
        .mockResolvedValueOnce([]) // judgements
        .mockResolvedValueOnce(mockContributions) // contributions
        .mockResolvedValueOnce([{ academic_contribution: '6.67' }]); // academic

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/agents/researcher.eth',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.academic_contribution).toBeCloseTo(6.67, 1);
      expect(body.contributions).toHaveLength(2);
      expect(body.contributions[0].repo_type).toBe('academia');
      expect(body.contributions[0].academia_field).toBe('ML');
    });

    it('should return 0 academic contribution for general-only agent', async () => {
      const mockAgent = {
        id: 'agent-gen',
        ens_name: 'coder.eth',
        role: 'developer',
        reputation_score: 80,
        total_points: '100',
        issues_completed: '2',
      };

      (query as jest.Mock)
        .mockResolvedValueOnce([mockAgent])
        .mockResolvedValueOnce([{ rank: '10' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'repo-1', name: 'gen', repo_type: 'general', academia_field: null, commit_count: '8', pr_count: '3' }])
        .mockResolvedValueOnce([{ academic_contribution: '0' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/agents/coder.eth',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.academic_contribution).toBe(0);
      expect(body.contributions[0].repo_type).toBe('general');
    });

    it('should return contributions with repo_type and academia_field', async () => {
      const mockAgent = {
        id: 'agent-mix',
        ens_name: 'mixed.eth',
        role: 'researcher',
        reputation_score: 120,
        total_points: '300',
        issues_completed: '7',
      };
      const mockContributions = [
        { id: 'r1', name: 'crypto-paper', repo_type: 'academia', academia_field: 'Cryptography', commit_count: '15', pr_count: '4' },
        { id: 'r2', name: 'web-app', repo_type: 'general', academia_field: null, commit_count: '20', pr_count: '6' },
      ];

      (query as jest.Mock)
        .mockResolvedValueOnce([mockAgent])
        .mockResolvedValueOnce([{ rank: '2' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockContributions)
        .mockResolvedValueOnce([{ academic_contribution: '4.29' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/leaderboard/agents/mixed.eth',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      const academiaContrib = body.contributions.find((c: any) => c.repo_type === 'academia');
      const generalContrib = body.contributions.find((c: any) => c.repo_type === 'general');
      expect(academiaContrib).toBeDefined();
      expect(academiaContrib.academia_field).toBe('Cryptography');
      expect(generalContrib).toBeDefined();
      expect(generalContrib.academia_field).toBeNull();
    });
  });
});
