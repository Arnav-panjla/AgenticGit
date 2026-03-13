/**
 * Commit Routes Tests (v2)
 * 
 * Tests for semantic commits, search, graph, and replay endpoints.
 */

import Fastify, { FastifyInstance } from 'fastify';
import { commitRoutes } from '../routes/commits';

// Mock SDK
jest.mock('../sdk', () => ({
  commitMemory: jest.fn(),
  readMemory: jest.fn(),
  searchCommits: jest.fn(),
  getCommitGraph: jest.fn(),
  getCommitReplay: jest.fn(),
}));

import * as sdk from '../sdk';

describe('Commit Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(commitRoutes, { prefix: '/repos' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /repos/:repoId/commits', () => {
    it('should create a basic commit', async () => {
      const mockCommit = {
        id: 'commit-123',
        repo_id: 'repo-1',
        branch_id: 'branch-1',
        message: 'Initial commit',
        content_ref: 'fileverse://abc123',
        author_ens: 'agent.eth',
        created_at: new Date().toISOString(),
      };

      (sdk.commitMemory as jest.Mock).mockResolvedValue(mockCommit);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Hello world',
          message: 'Initial commit',
          author_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Initial commit');
    });

    it('should create a commit with semantic features', async () => {
      const mockCommit = {
        id: 'commit-456',
        repo_id: 'repo-1',
        message: 'Add reasoning step',
        reasoning_type: 'analysis',
        semantic_summary: 'Analyzed data patterns',
        created_at: new Date().toISOString(),
      };

      (sdk.commitMemory as jest.Mock).mockResolvedValue(mockCommit);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Analysis result',
          message: 'Add reasoning step',
          author_ens: 'agent.eth',
          content_type: 'json',
          reasoning_type: 'analysis',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.reasoning_type).toBe('analysis');
    });

    it('should create a commit with trace data', async () => {
      const mockCommit = {
        id: 'commit-789',
        repo_id: 'repo-1',
        message: 'Traced commit',
        trace_prompt: 'What is 2+2?',
        trace_result: '4',
        created_at: new Date().toISOString(),
      };

      (sdk.commitMemory as jest.Mock).mockResolvedValue(mockCommit);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Result: 4',
          message: 'Traced commit',
          author_ens: 'agent.eth',
          trace: {
            prompt: 'What is 2+2?',
            context: { subject: 'math' },
            tools: ['calculator'],
            result: '4',
          },
        },
      });

      expect(response.statusCode).toBe(201);
      expect(sdk.commitMemory).toHaveBeenCalledWith(
        'repo-1',
        'main',
        'Result: 4',
        'Traced commit',
        'agent.eth',
        expect.objectContaining({
          trace: expect.objectContaining({
            prompt: 'What is 2+2?',
          }),
        })
      );
    });

    it('should return 400 if branch is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          content: 'Hello',
          message: 'Test',
          author_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if content is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          message: 'Test',
          author_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 on SDK error', async () => {
      (sdk.commitMemory as jest.Mock).mockRejectedValue(
        new Error('Branch not found')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'nonexistent',
          content: 'Hello',
          message: 'Test',
          author_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Branch not found');
    });
  });

  describe('GET /repos/:repoId/commits', () => {
    it('should read commits with permission filtering', async () => {
      const mockCommits = [
        {
          id: 'commit-1',
          message: 'Commit 1',
          author_ens: 'agent.eth',
        },
        {
          id: 'commit-2',
          message: 'Commit 2',
          author_ens: 'other.eth',
        },
      ];

      (sdk.readMemory as jest.Mock).mockResolvedValue(mockCommits);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits?agent_ens=agent.eth',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
      expect(sdk.readMemory).toHaveBeenCalledWith(
        'repo-1',
        'agent.eth',
        undefined
      );
    });

    it('should filter by branch', async () => {
      (sdk.readMemory as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits?agent_ens=agent.eth&branch=feature',
      });

      expect(response.statusCode).toBe(200);
      expect(sdk.readMemory).toHaveBeenCalledWith(
        'repo-1',
        'agent.eth',
        'feature'
      );
    });

    it('should return 400 if agent_ens is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('agent_ens');
    });
  });

  describe('GET /repos/:repoId/commits/search', () => {
    it('should search commits semantically', async () => {
      const mockResults = [
        {
          id: 'commit-1',
          message: 'Related commit',
          similarity: 0.85,
        },
        {
          id: 'commit-2',
          message: 'Another match',
          similarity: 0.72,
        },
      ];

      (sdk.searchCommits as jest.Mock).mockResolvedValue(mockResults);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/search?q=data analysis',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
      expect(sdk.searchCommits).toHaveBeenCalledWith('repo-1', 'data analysis', 10);
    });

    it('should respect limit parameter', async () => {
      (sdk.searchCommits as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/search?q=test&limit=5',
      });

      expect(response.statusCode).toBe(200);
      expect(sdk.searchCommits).toHaveBeenCalledWith('repo-1', 'test', 5);
    });

    it('should return 400 if query is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/search',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('q');
    });
  });

  describe('GET /repos/:repoId/commits/graph', () => {
    it('should get commit reasoning graph', async () => {
      const mockGraph = {
        nodes: [
          { id: 'commit-1', type: 'observation' },
          { id: 'commit-2', type: 'analysis' },
          { id: 'commit-3', type: 'conclusion' },
        ],
        edges: [
          { from: 'commit-1', to: 'commit-2' },
          { from: 'commit-2', to: 'commit-3' },
        ],
      };

      (sdk.getCommitGraph as jest.Mock).mockResolvedValue(mockGraph);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/graph',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.nodes).toHaveLength(3);
      expect(body.edges).toHaveLength(2);
    });

    it('should filter graph by root commit', async () => {
      (sdk.getCommitGraph as jest.Mock).mockResolvedValue({ nodes: [], edges: [] });

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/graph?root=commit-5',
      });

      expect(response.statusCode).toBe(200);
      expect(sdk.getCommitGraph).toHaveBeenCalledWith('repo-1', 'commit-5');
    });
  });

  describe('GET /repos/:repoId/commits/:commitId', () => {
    it('should get single commit with replay data', async () => {
      const mockResult = {
        commit: {
          id: 'commit-123',
          message: 'Test commit',
          reasoning_type: 'analysis',
        },
        trace: {
          prompt: 'Analyze this',
          result: 'Analysis complete',
        },
        reasoningChain: [],
      };

      (sdk.getCommitReplay as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/commit-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.commit.id).toBe('commit-123');
    });

    it('should return 404 if commit not found', async () => {
      (sdk.getCommitReplay as jest.Mock).mockRejectedValue(
        new Error('Commit not found')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /repos/:repoId/commits/:commitId/replay', () => {
    it('should get commit replay trace', async () => {
      const mockResult = {
        commit: {
          id: 'commit-123',
          message: 'Test commit',
          reasoning_type: 'analysis',
        },
        trace: {
          prompt: 'Analyze this data',
          context: { source: 'test' },
          tools: ['analyzer'],
          result: 'Analysis complete',
        },
        reasoningChain: [
          {
            id: 'commit-100',
            message: 'Previous step',
            reasoning_type: 'observation',
            author_ens: 'agent.eth',
            created_at: new Date().toISOString(),
          },
        ],
      };

      (sdk.getCommitReplay as jest.Mock).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/commit-123/replay',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.commit_id).toBe('commit-123');
      expect(body.trace.prompt).toBe('Analyze this data');
      expect(body.reasoning_chain).toHaveLength(1);
    });

    it('should return 404 if commit not found', async () => {
      (sdk.getCommitReplay as jest.Mock).mockRejectedValue(
        new Error('Commit not found')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/nonexistent/replay',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
