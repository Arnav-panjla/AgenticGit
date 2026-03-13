/**
 * Pull Request Routes Tests
 */

import Fastify, { FastifyInstance } from 'fastify';
import { pullRequestRoutes } from '../routes/pullrequests';

// Mock SDK
jest.mock('../sdk', () => ({
  openPullRequest: jest.fn(),
  mergePullRequest: jest.fn(),
  getAgent: jest.fn(),
}));

// Mock database
jest.mock('../db/client', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  pool: { end: jest.fn() },
}));

import * as sdk from '../sdk';
import { query } from '../db/client';

describe('Pull Request Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(pullRequestRoutes, { prefix: '/repos' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /repos/:repoId/pulls', () => {
    it('should create a pull request', async () => {
      const mockPR = {
        id: 'pr-123',
        repo_id: 'repo-1',
        source_branch_id: 'branch-1',
        target_branch_id: 'branch-2',
        description: 'My PR',
        status: 'open',
        bounty_amount: 0,
        author_agent_id: 'agent-1',
        created_at: new Date().toISOString(),
      };

      (sdk.openPullRequest as jest.Mock).mockResolvedValue(mockPR);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls',
        payload: {
          source_branch: 'feature',
          target_branch: 'main',
          description: 'My PR',
          author_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('open');
      expect(sdk.openPullRequest).toHaveBeenCalledWith(
        'repo-1',
        'feature',
        'main',
        'My PR',
        'agent.eth',
        0
      );
    });

    it('should create a PR with bounty', async () => {
      const mockPR = {
        id: 'pr-124',
        bounty_amount: 50,
        status: 'open',
      };

      (sdk.openPullRequest as jest.Mock).mockResolvedValue(mockPR);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls',
        payload: {
          source_branch: 'feature',
          target_branch: 'main',
          description: 'PR with bounty',
          author_ens: 'agent.eth',
          bounty_amount: 50,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(sdk.openPullRequest).toHaveBeenCalledWith(
        'repo-1',
        'feature',
        'main',
        'PR with bounty',
        'agent.eth',
        50
      );
    });

    it('should return 400 if source_branch is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls',
        payload: {
          target_branch: 'main',
          author_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('source_branch');
    });

    it('should return 400 if target_branch is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls',
        payload: {
          source_branch: 'feature',
          author_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('target_branch');
    });

    it('should return 400 if author_ens is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls',
        payload: {
          source_branch: 'feature',
          target_branch: 'main',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 on SDK error', async () => {
      (sdk.openPullRequest as jest.Mock).mockRejectedValue(
        new Error('Source branch not found')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls',
        payload: {
          source_branch: 'nonexistent',
          target_branch: 'main',
          author_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Source branch not found');
    });
  });

  describe('GET /repos/:repoId/pulls', () => {
    it('should list all pull requests', async () => {
      const mockPRs = [
        {
          id: 'pr-1',
          description: 'First PR',
          status: 'open',
          author_ens: 'agent1.eth',
          source_branch_name: 'feature-1',
          target_branch_name: 'main',
        },
        {
          id: 'pr-2',
          description: 'Second PR',
          status: 'merged',
          author_ens: 'agent2.eth',
          source_branch_name: 'feature-2',
          target_branch_name: 'main',
        },
      ];

      (query as jest.Mock).mockResolvedValue(mockPRs);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/pulls',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const mockPRs = [
        {
          id: 'pr-1',
          status: 'open',
        },
      ];

      (query as jest.Mock).mockResolvedValue(mockPRs);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/pulls?status=open',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe('open');
    });
  });

  describe('GET /repos/:repoId/pulls/:prId', () => {
    it('should get a single PR', async () => {
      const mockPR = {
        id: 'pr-123',
        description: 'My PR',
        status: 'open',
        author_ens: 'agent.eth',
        source_branch_name: 'feature',
        target_branch_name: 'main',
      };

      (query as jest.Mock).mockResolvedValue([mockPR]);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/pulls/pr-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('pr-123');
    });

    it('should return 404 if PR not found', async () => {
      (query as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/pulls/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /repos/:repoId/pulls/:prId/merge', () => {
    it('should merge a pull request', async () => {
      const mockMergedPR = {
        id: 'pr-123',
        status: 'merged',
        reviewer_agent_id: 'reviewer-1',
      };

      (sdk.mergePullRequest as jest.Mock).mockResolvedValue(mockMergedPR);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls/pr-123/merge',
        payload: {
          reviewer_ens: 'reviewer.eth',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('merged');
      expect(sdk.mergePullRequest).toHaveBeenCalledWith('pr-123', 'reviewer.eth');
    });

    it('should return 400 if reviewer_ens is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls/pr-123/merge',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 on SDK error', async () => {
      (sdk.mergePullRequest as jest.Mock).mockRejectedValue(
        new Error('PR already merged')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls/pr-123/merge',
        payload: {
          reviewer_ens: 'reviewer.eth',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('PR already merged');
    });
  });

  describe('POST /repos/:repoId/pulls/:prId/reject', () => {
    it('should reject a pull request', async () => {
      const mockAgent = { id: 'reviewer-1', ens_name: 'reviewer.eth' };
      const mockRejectedPR = {
        id: 'pr-123',
        status: 'rejected',
        reviewer_agent_id: 'reviewer-1',
      };

      (sdk.getAgent as jest.Mock).mockResolvedValue(mockAgent);
      (query as jest.Mock).mockResolvedValue([mockRejectedPR]);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls/pr-123/reject',
        payload: {
          reviewer_ens: 'reviewer.eth',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('rejected');
    });

    it('should return 400 if reviewer_ens is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls/pr-123/reject',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if reviewer not found', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls/pr-123/reject',
        payload: {
          reviewer_ens: 'nonexistent.eth',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if PR not found or already closed', async () => {
      const mockAgent = { id: 'reviewer-1', ens_name: 'reviewer.eth' };
      (sdk.getAgent as jest.Mock).mockResolvedValue(mockAgent);
      (query as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/pulls/pr-123/reject',
        payload: {
          reviewer_ens: 'reviewer.eth',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
