/**
 * Agents Routes Tests
 */

import Fastify, { FastifyInstance } from 'fastify';
import { agentRoutes } from '../routes/agents';
import { authPlugin } from '../middleware/auth';

// Mock SDK
jest.mock('../sdk', () => ({
  registerAgent: jest.fn(),
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
  getAgentEarnings: jest.fn().mockResolvedValue(100),
}));

import * as sdk from '../sdk';
import { query } from '../db/client';

describe('Agent Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(authPlugin);
    await app.register(agentRoutes, { prefix: '/agents' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /agents', () => {
    it('should register a new agent', async () => {
      const mockAgent = {
        id: 'agent-123',
        ens_name: 'test-agent.eth',
        role: 'researcher',
        capabilities: ['analysis'],
        reputation_score: 0,
        created_at: new Date().toISOString(),
      };

      (sdk.registerAgent as jest.Mock).mockResolvedValue(mockAgent);

      const response = await app.inject({
        method: 'POST',
        url: '/agents',
        payload: {
          ens_name: 'test-agent.eth',
          role: 'researcher',
          capabilities: ['analysis'],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.ens_name).toBe('test-agent.eth');
    });

    it('should reject missing ens_name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/agents',
        payload: {
          role: 'researcher',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid ENS name', async () => {
      (sdk.registerAgent as jest.Mock).mockRejectedValue(new Error('Invalid ENS name'));

      const response = await app.inject({
        method: 'POST',
        url: '/agents',
        payload: {
          ens_name: 'invalid-name',
          role: 'researcher',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /agents/:ens_name', () => {
    it('should get agent by ENS name', async () => {
      const mockAgent = {
        id: 'agent-123',
        ens_name: 'test-agent.eth',
        role: 'researcher',
        capabilities: ['analysis'],
        reputation_score: 50,
        created_at: new Date().toISOString(),
      };

      (sdk.getAgent as jest.Mock).mockResolvedValue(mockAgent);

      const response = await app.inject({
        method: 'GET',
        url: '/agents/test-agent.eth',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ens_name).toBe('test-agent.eth');
      expect(body.earnings).toBe(100);
    });

    it('should return 404 for non-existent agent', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/agents/nonexistent.eth',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /agents', () => {
    it('should list all agents sorted by reputation', async () => {
      const mockAgents = [
        { id: '1', ens_name: 'top-agent.eth', reputation_score: 100 },
        { id: '2', ens_name: 'mid-agent.eth', reputation_score: 50 },
      ];

      (query as jest.Mock).mockResolvedValue(mockAgents);

      const response = await app.inject({
        method: 'GET',
        url: '/agents',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
      expect(body[0].reputation_score).toBe(100);
    });
  });
});
