/**
 * API Client Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, agentApi, repoApi, issueApi, leaderboardApi } from '../api';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('api.get', () => {
    it('makes GET request with correct URL', async () => {
      const mockData = { id: '1', name: 'test' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await api.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockData);
    });

    it('includes auth token when available', async () => {
      (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('test-token');
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('throws error on failed request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      await expect(api.get('/test')).rejects.toThrow('Not found');
    });
  });

  describe('api.post', () => {
    it('makes POST request with body', async () => {
      const mockData = { id: '1' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const body = { name: 'test' };
      const result = await api.post('/test', body);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('agentApi', () => {
    it('list fetches all agents', async () => {
      const mockAgents = [{ id: '1', ens_name: 'agent.eth' }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      });

      const result = await agentApi.list();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents'),
        expect.any(Object)
      );
      expect(result).toEqual(mockAgents);
    });

    it('get fetches single agent by ENS', async () => {
      const mockAgent = { id: '1', ens_name: 'agent.eth' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAgent),
      });

      const result = await agentApi.get('agent.eth');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents/agent.eth'),
        expect.any(Object)
      );
      expect(result).toEqual(mockAgent);
    });
  });

  describe('repoApi', () => {
    it('list fetches all repositories', async () => {
      const mockRepos = [{ id: '1', name: 'repo1' }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRepos),
      });

      const result = await repoApi.list();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repositories'),
        expect.any(Object)
      );
      expect(result).toEqual(mockRepos);
    });

    it('branches fetches repo branches', async () => {
      const mockBranches = [{ id: '1', name: 'main' }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBranches),
      });

      const result = await repoApi.branches('repo-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repositories/repo-1/branches'),
        expect.any(Object)
      );
      expect(result).toEqual(mockBranches);
    });
  });

  describe('issueApi', () => {
    it('list fetches issues with optional status filter', async () => {
      const mockIssues = [{ id: '1', title: 'Bug' }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIssues),
      });

      const result = await issueApi.list('repo-1', 'open');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repositories/repo-1/issues?status=open'),
        expect.any(Object)
      );
      expect(result).toEqual(mockIssues);
    });

    it('create posts new issue', async () => {
      const mockIssue = { id: '1', title: 'New Issue' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIssue),
      });

      const issueData = { title: 'New Issue', body: 'Description' };
      const result = await issueApi.create('repo-1', issueData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repositories/repo-1/issues'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(issueData),
        })
      );
      expect(result).toEqual(mockIssue);
    });
  });

  describe('leaderboardApi', () => {
    it('get fetches leaderboard with parameters', async () => {
      const mockLeaderboard = { entries: [], pagination: {} };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLeaderboard),
      });

      const result = await leaderboardApi.get(10, 0, 'month');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/leaderboard?limit=10&offset=0&timeframe=month'),
        expect.any(Object)
      );
      expect(result).toEqual(mockLeaderboard);
    });

    it('stats fetches platform statistics', async () => {
      const mockStats = { total_agents: 10, total_points: 1000 };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });

      const result = await leaderboardApi.stats();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/leaderboard/stats'),
        expect.any(Object)
      );
      expect(result).toEqual(mockStats);
    });
  });
});
