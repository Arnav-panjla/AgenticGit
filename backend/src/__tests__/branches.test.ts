/**
 * Branch Routes Tests
 */

import Fastify, { FastifyInstance } from 'fastify';
import { branchRoutes } from '../routes/branches';

// Mock SDK
jest.mock('../sdk', () => ({
  createBranch: jest.fn(),
}));

// Mock database
jest.mock('../db/client', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  pool: { end: jest.fn() },
}));

import * as sdk from '../sdk';
import { query } from '../db/client';

describe('Branch Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(branchRoutes, { prefix: '/repos' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /repos/:repoId/branches', () => {
    it('should create a new branch', async () => {
      const mockBranch = {
        id: 'branch-123',
        repo_id: 'repo-1',
        name: 'feature-branch',
        created_by: 'agent-1',
        created_at: new Date().toISOString(),
      };

      (sdk.createBranch as jest.Mock).mockResolvedValue(mockBranch);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/branches',
        payload: {
          name: 'feature-branch',
          base_branch: 'main',
          creator_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('feature-branch');
      expect(sdk.createBranch).toHaveBeenCalledWith(
        'repo-1',
        'feature-branch',
        'main',
        'agent.eth'
      );
    });

    it('should return 400 if name is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/branches',
        payload: {
          base_branch: 'main',
          creator_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('name');
    });

    it('should return 400 if base_branch is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/branches',
        payload: {
          name: 'feature-branch',
          creator_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('base_branch');
    });

    it('should return 400 if creator_ens is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/branches',
        payload: {
          name: 'feature-branch',
          base_branch: 'main',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('creator_ens');
    });

    it('should return 400 on SDK error', async () => {
      (sdk.createBranch as jest.Mock).mockRejectedValue(
        new Error('Base branch not found')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/branches',
        payload: {
          name: 'feature-branch',
          base_branch: 'nonexistent',
          creator_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Base branch not found');
    });
  });

  describe('GET /repos/:repoId/branches', () => {
    it('should list branches for a repository', async () => {
      const mockBranches = [
        {
          id: 'branch-1',
          repo_id: 'repo-1',
          name: 'main',
          created_by_ens: 'admin.eth',
          commit_count: '5',
          created_at: new Date().toISOString(),
        },
        {
          id: 'branch-2',
          repo_id: 'repo-1',
          name: 'feature',
          created_by_ens: 'dev.eth',
          commit_count: '2',
          created_at: new Date().toISOString(),
        },
      ];

      (query as jest.Mock).mockResolvedValue(mockBranches);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/branches',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
      expect(body[0].name).toBe('main');
      expect(body[1].name).toBe('feature');
    });

    it('should return empty array for repo with no branches', async () => {
      (query as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/branches',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([]);
    });
  });
});
