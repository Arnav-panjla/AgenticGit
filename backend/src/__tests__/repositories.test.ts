/**
 * Repository Routes Tests
 */

import Fastify, { FastifyInstance } from 'fastify';
import { repositoryRoutes } from '../routes/repositories';
import { authPlugin } from '../middleware/auth';

// Mock SDK
jest.mock('../sdk', () => ({
  createRepository: jest.fn(),
  getAgent: jest.fn(),
}));

// Mock database
jest.mock('../db/client', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  pool: { end: jest.fn() },
}));

// Mock bounty service
jest.mock('../services/bounty', () => ({
  deposit: jest.fn(),
  getLedger: jest.fn(),
}));

import * as sdk from '../sdk';
import { query, queryOne } from '../db/client';
import * as bountyService from '../services/bounty';

describe('Repository Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(authPlugin);
    await app.register(repositoryRoutes, { prefix: '/repositories' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /repositories', () => {
    it('should create a repository', async () => {
      const mockRepo = {
        id: 'repo-123',
        name: 'test-repo',
        description: 'A test repository',
        owner_agent_id: 'agent-123',
        bounty_pool: 0,
        created_at: new Date().toISOString(),
      };

      (sdk.createRepository as jest.Mock).mockResolvedValue(mockRepo);

      const response = await app.inject({
        method: 'POST',
        url: '/repositories',
        payload: {
          name: 'test-repo',
          owner_ens: 'test-agent.eth',
          description: 'A test repository',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('test-repo');
    });

    it('should reject missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repositories',
        payload: {
          owner_ens: 'test-agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /repositories', () => {
    it('should list repositories with counts', async () => {
      const mockRepos = [
        {
          id: 'repo-1',
          name: 'repo-1',
          owner_ens: 'agent-1.eth',
          branch_count: 2,
          commit_count: 10,
          default_permission: 'public',
        },
      ];

      (query as jest.Mock).mockResolvedValue(mockRepos);

      const response = await app.inject({
        method: 'GET',
        url: '/repositories',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].branch_count).toBe(2);
    });
  });

  describe('GET /repositories/:id', () => {
    it('should get single repository', async () => {
      const mockRepo = {
        id: 'repo-123',
        name: 'test-repo',
        owner_ens: 'test-agent.eth',
      };

      (queryOne as jest.Mock).mockResolvedValue(mockRepo);

      const response = await app.inject({
        method: 'GET',
        url: '/repositories/repo-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('test-repo');
    });

    it('should return 404 for non-existent repo', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/repositories/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /repositories/:id/deposit', () => {
    it('should deposit bounty', async () => {
      const mockAgent = { id: 'agent-123', ens_name: 'test-agent.eth' };
      const mockEntry = {
        id: 'entry-1',
        amount: 100,
        tx_type: 'deposit',
      };

      (sdk.getAgent as jest.Mock).mockResolvedValue(mockAgent);
      (bountyService.deposit as jest.Mock).mockResolvedValue(mockEntry);

      const response = await app.inject({
        method: 'POST',
        url: '/repositories/repo-123/deposit',
        payload: {
          agent_ens: 'test-agent.eth',
          amount: 100,
          note: 'Initial deposit',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.amount).toBe(100);
    });

    it('should reject deposit from unknown agent', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/repositories/repo-123/deposit',
        payload: {
          agent_ens: 'unknown.eth',
          amount: 100,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /repositories/:id/bounty', () => {
    it('should get bounty ledger', async () => {
      const mockLedger = [
        { id: 'entry-1', amount: 100, tx_type: 'deposit' },
        { id: 'entry-2', amount: -50, tx_type: 'escrow' },
      ];

      (bountyService.getLedger as jest.Mock).mockResolvedValue(mockLedger);

      const response = await app.inject({
        method: 'GET',
        url: '/repositories/repo-123/bounty',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
    });
  });
});
