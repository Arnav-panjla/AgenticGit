/**
 * Commit Routes Tests (v5)
 * 
 * Tests for semantic commits, search, graph, replay,
 * knowledge context handoff, failure memory, and
 * workflow run endpoints.
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
  getContextChain: jest.fn(),
  searchFailures: jest.fn(),
}));

// Mock hooks service
jest.mock('../services/hooks', () => ({
  runCommitHooks: jest.fn().mockResolvedValue(undefined),
  getWorkflowRuns: jest.fn(),
  getWorkflowRunForCommit: jest.fn(),
}));

import * as sdk from '../sdk';
import * as hooks from '../services/hooks';

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

    it('should create a commit with knowledge context', async () => {
      const mockCommit = {
        id: 'commit-kc-1',
        repo_id: 'repo-1',
        message: 'Architecture design for Sudoku game',
        knowledge_context: {
          decisions: ['Use React for UI', 'Backtracking solver algorithm'],
          architecture: 'Component → Grid → Cell hierarchy',
          libraries: ['react', 'typescript'],
          open_questions: ['Should we support 16x16 grids?'],
          next_steps: ['Implement grid renderer', 'Add solver engine'],
          dependencies: [],
          handoff_summary: 'Designed core architecture with component hierarchy and solver approach.',
        },
        created_at: new Date().toISOString(),
      };

      (sdk.commitMemory as jest.Mock).mockResolvedValue(mockCommit);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Architecture document',
          message: 'Architecture design for Sudoku game',
          author_ens: 'architect.eth',
          knowledge_context: {
            decisions: ['Use React for UI', 'Backtracking solver algorithm'],
            architecture: 'Component → Grid → Cell hierarchy',
            libraries: ['react', 'typescript'],
            open_questions: ['Should we support 16x16 grids?'],
            next_steps: ['Implement grid renderer', 'Add solver engine'],
            dependencies: [],
            handoff_summary: 'Designed core architecture with component hierarchy and solver approach.',
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.knowledge_context).toBeDefined();
      expect(body.knowledge_context.decisions).toHaveLength(2);
      expect(body.knowledge_context.handoff_summary).toContain('core architecture');
      expect(body.knowledge_context.libraries).toEqual(['react', 'typescript']);
    });

    it('should pass knowledge context to SDK commitMemory', async () => {
      (sdk.commitMemory as jest.Mock).mockResolvedValue({
        id: 'commit-kc-2',
        repo_id: 'repo-1',
        message: 'Implement solver',
        created_at: new Date().toISOString(),
      });

      const knowledgeContext = {
        decisions: ['Use backtracking algorithm'],
        next_steps: ['Add unit tests'],
        handoff_summary: 'Solver implemented with backtracking.',
      };

      await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'feature/solver',
          content: 'Solver implementation',
          message: 'Implement solver',
          author_ens: 'engineer.eth',
          knowledge_context: knowledgeContext,
        },
      });

      expect(sdk.commitMemory).toHaveBeenCalledWith(
        'repo-1',
        'feature/solver',
        'Solver implementation',
        'Implement solver',
        'engineer.eth',
        expect.objectContaining({
          knowledgeContext: expect.objectContaining({
            decisions: ['Use backtracking algorithm'],
            next_steps: ['Add unit tests'],
            handoff_summary: 'Solver implemented with backtracking.',
          }),
        })
      );
    });

    it('should handle commit with both trace and knowledge context', async () => {
      const mockCommit = {
        id: 'commit-kc-3',
        repo_id: 'repo-1',
        message: 'QA validation',
        trace_prompt: 'Run test suite',
        trace_result: 'All 42 tests passed',
        knowledge_context: {
          decisions: ['100% coverage on solver module'],
          handoff_summary: 'All tests passing. Ready for release.',
        },
        created_at: new Date().toISOString(),
      };

      (sdk.commitMemory as jest.Mock).mockResolvedValue(mockCommit);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Test results',
          message: 'QA validation',
          author_ens: 'qa.eth',
          trace: {
            prompt: 'Run test suite',
            result: 'All 42 tests passed',
          },
          knowledge_context: {
            decisions: ['100% coverage on solver module'],
            handoff_summary: 'All tests passing. Ready for release.',
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.knowledge_context).toBeDefined();
      expect(body.trace_prompt).toBe('Run test suite');
    });

    it('should handle commit with empty knowledge context gracefully', async () => {
      (sdk.commitMemory as jest.Mock).mockResolvedValue({
        id: 'commit-kc-4',
        repo_id: 'repo-1',
        message: 'Minor fix',
        knowledge_context: {
          decisions: [],
          libraries: [],
          open_questions: [],
          next_steps: [],
          dependencies: [],
        },
        created_at: new Date().toISOString(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Fix',
          message: 'Minor fix',
          author_ens: 'agent.eth',
          knowledge_context: {},
        },
      });

      expect(response.statusCode).toBe(201);
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

  describe('GET /repos/:repoId/context-chain', () => {
    it('should return context chain with agent handoffs and knowledge briefs', async () => {
      const mockChain = {
        repo_id: 'repo-1',
        total_commits: 5,
        total_agents: 3,
        handoffs: [
          {
            agent: { id: 'agent-1', ens_name: 'architect.eth', role: 'architect' },
            commits: [
              {
                id: 'commit-1',
                message: 'Plan architecture',
                semantic_summary: 'Designed system architecture for Sudoku game',
                reasoning_type: 'knowledge',
                tags: ['architecture', 'planning'],
                created_at: '2026-01-01T00:00:00Z',
                branch_name: 'main',
                knowledge_context: {
                  decisions: ['Use React', 'Use backtracking solver'],
                  architecture: 'Grid → Cell → Solver',
                  libraries: ['react', 'typescript'],
                  next_steps: ['Implement grid', 'Build solver'],
                  handoff_summary: 'Architecture complete. Ready for implementation.',
                },
              },
              {
                id: 'commit-2',
                message: 'Define data structures',
                semantic_summary: 'Defined grid, cell, and solver interfaces',
                reasoning_type: 'knowledge',
                tags: ['data-model'],
                created_at: '2026-01-01T01:00:00Z',
                branch_name: 'main',
                knowledge_context: null,
              },
            ],
            contribution_summary: 'Defined grid, cell, and solver interfaces',
            knowledge_brief: {
              decisions: ['Use React', 'Use backtracking solver'],
              architecture: 'Grid → Cell → Solver',
              libraries: ['react', 'typescript'],
              next_steps: ['Implement grid', 'Build solver'],
              handoff_summary: 'Architecture complete. Ready for implementation.',
            },
          },
          {
            agent: { id: 'agent-2', ens_name: 'engineer.eth', role: 'engineer' },
            commits: [
              {
                id: 'commit-3',
                message: 'Implement solver',
                semantic_summary: 'Implemented backtracking Sudoku solver',
                reasoning_type: 'experiment',
                tags: ['implementation', 'solver'],
                created_at: '2026-01-01T02:00:00Z',
                branch_name: 'main',
                knowledge_context: {
                  decisions: ['Constraint propagation before backtracking'],
                  libraries: ['jest'],
                  next_steps: ['Add comprehensive tests'],
                  handoff_summary: 'Solver working. Needs test coverage.',
                },
              },
            ],
            contribution_summary: 'Implemented backtracking Sudoku solver',
            knowledge_brief: {
              decisions: ['Constraint propagation before backtracking'],
              libraries: ['jest'],
              next_steps: ['Add comprehensive tests'],
              handoff_summary: 'Solver working. Needs test coverage.',
            },
          },
          {
            agent: { id: 'agent-3', ens_name: 'qa.eth', role: 'qa' },
            commits: [
              {
                id: 'commit-4',
                message: 'Add unit tests',
                semantic_summary: 'Added comprehensive test suite for solver',
                reasoning_type: 'conclusion',
                tags: ['testing'],
                created_at: '2026-01-01T03:00:00Z',
                branch_name: 'main',
                knowledge_context: null,
              },
              {
                id: 'commit-5',
                message: 'Edge case tests',
                semantic_summary: 'Covered empty grid and invalid input edge cases',
                reasoning_type: 'conclusion',
                tags: ['testing', 'edge-cases'],
                created_at: '2026-01-01T04:00:00Z',
                branch_name: 'main',
                knowledge_context: {
                  decisions: ['100% solver coverage achieved'],
                  handoff_summary: 'All tests green. Production ready.',
                },
              },
            ],
            contribution_summary: 'Covered empty grid and invalid input edge cases',
            knowledge_brief: {
              decisions: ['100% solver coverage achieved'],
              handoff_summary: 'All tests green. Production ready.',
            },
          },
        ],
      };

      (sdk.getContextChain as jest.Mock).mockResolvedValue(mockChain);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/context-chain',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.repo_id).toBe('repo-1');
      expect(body.total_commits).toBe(5);
      expect(body.total_agents).toBe(3);
      expect(body.handoffs).toHaveLength(3);
      expect(body.handoffs[0].agent.ens_name).toBe('architect.eth');
      expect(body.handoffs[0].commits).toHaveLength(2);
      expect(body.handoffs[0].knowledge_brief).toBeDefined();
      expect(body.handoffs[0].knowledge_brief.decisions).toHaveLength(2);
      expect(body.handoffs[0].knowledge_brief.libraries).toEqual(['react', 'typescript']);
      expect(body.handoffs[1].agent.ens_name).toBe('engineer.eth');
      expect(body.handoffs[1].knowledge_brief.handoff_summary).toContain('Needs test coverage');
      expect(body.handoffs[2].agent.ens_name).toBe('qa.eth');
      expect(body.handoffs[2].knowledge_brief.handoff_summary).toContain('Production ready');
    });

    it('should pass branch filter to SDK', async () => {
      (sdk.getContextChain as jest.Mock).mockResolvedValue({
        repo_id: 'repo-1',
        total_commits: 0,
        total_agents: 0,
        handoffs: [],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/context-chain?branch=feature',
      });

      expect(response.statusCode).toBe(200);
      expect(sdk.getContextChain).toHaveBeenCalledWith('repo-1', 'feature');
    });

    it('should return empty chain for repo with no commits', async () => {
      (sdk.getContextChain as jest.Mock).mockResolvedValue({
        repo_id: 'repo-1',
        total_commits: 0,
        total_agents: 0,
        handoffs: [],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/context-chain',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total_commits).toBe(0);
      expect(body.handoffs).toHaveLength(0);
    });

    it('should return 400 on SDK error', async () => {
      (sdk.getContextChain as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/context-chain',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Database error');
    });
  });

  // ─── Failure Memory (v5) ──────────────────────────────────────────────────

  describe('POST /repos/:repoId/commits (with failure_context)', () => {
    it('should create a commit with failure context', async () => {
      const mockCommit = {
        id: 'commit-fail-1',
        repo_id: 'repo-1',
        message: 'Attempted mutex fix (failed)',
        failure_context: {
          failed: true,
          error_type: 'security_vulnerability',
          error_detail: 'Mutex does not prevent reentrancy',
          failed_approach: 'Boolean mutex lock around withdraw',
          root_cause: 'Violated CEI pattern',
          severity: 'high',
        },
        created_at: new Date().toISOString(),
      };

      (sdk.commitMemory as jest.Mock).mockResolvedValue(mockCommit);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Failed mutex approach',
          message: 'Attempted mutex fix (failed)',
          author_ens: 'agent.eth',
          failure_context: {
            failed: true,
            error_type: 'security_vulnerability',
            error_detail: 'Mutex does not prevent reentrancy',
            failed_approach: 'Boolean mutex lock around withdraw',
            root_cause: 'Violated CEI pattern',
            severity: 'high',
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.failure_context).toBeDefined();
      expect(body.failure_context.failed).toBe(true);
      expect(body.failure_context.error_type).toBe('security_vulnerability');
      expect(body.failure_context.severity).toBe('high');
    });

    it('should pass failure context to SDK commitMemory', async () => {
      (sdk.commitMemory as jest.Mock).mockResolvedValue({
        id: 'commit-fail-2',
        repo_id: 'repo-1',
        message: 'Wrong hash function',
        created_at: new Date().toISOString(),
      });

      const failureContext = {
        failed: true,
        error_type: 'logic_error',
        failed_approach: 'Used SHA-256 instead of keccak256',
        severity: 'medium',
      };

      await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Wrong hash',
          message: 'Wrong hash function',
          author_ens: 'audit.eth',
          failure_context: failureContext,
        },
      });

      expect(sdk.commitMemory).toHaveBeenCalledWith(
        'repo-1',
        'main',
        'Wrong hash',
        'Wrong hash function',
        'audit.eth',
        expect.objectContaining({
          failureContext: expect.objectContaining({
            failed: true,
            error_type: 'logic_error',
            failed_approach: 'Used SHA-256 instead of keccak256',
            severity: 'medium',
          }),
        })
      );
    });

    it('should trigger async commit hooks after successful commit', async () => {
      const mockCommit = {
        id: 'commit-hook-1',
        repo_id: 'repo-1',
        message: 'Test hooks trigger',
        created_at: new Date().toISOString(),
      };

      (sdk.commitMemory as jest.Mock).mockResolvedValue(mockCommit);
      (hooks.runCommitHooks as jest.Mock).mockResolvedValue(undefined);

      await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Some content',
          message: 'Test hooks trigger',
          author_ens: 'agent.eth',
        },
      });

      expect(hooks.runCommitHooks).toHaveBeenCalledWith(
        expect.objectContaining({
          repoId: 'repo-1',
          commitId: 'commit-hook-1',
          content: 'Some content',
          message: 'Test hooks trigger',
        })
      );
    });

    it('should still return commit even if hooks fail', async () => {
      const mockCommit = {
        id: 'commit-hook-fail',
        repo_id: 'repo-1',
        message: 'Commit succeeds despite hook failure',
        created_at: new Date().toISOString(),
      };

      (sdk.commitMemory as jest.Mock).mockResolvedValue(mockCommit);
      (hooks.runCommitHooks as jest.Mock).mockRejectedValue(new Error('Hook crashed'));

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Content',
          message: 'Commit succeeds despite hook failure',
          author_ens: 'agent.eth',
        },
      });

      // The commit itself should succeed — hooks are fire-and-forget
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('commit-hook-fail');
    });

    it('should handle commit with both failure context and knowledge context', async () => {
      const mockCommit = {
        id: 'commit-both',
        repo_id: 'repo-1',
        message: 'Failed approach with learnings',
        failure_context: { failed: true, error_type: 'timeout' },
        knowledge_context: { decisions: ['Retry with exponential backoff'] },
        created_at: new Date().toISOString(),
      };

      (sdk.commitMemory as jest.Mock).mockResolvedValue(mockCommit);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/commits',
        payload: {
          branch: 'main',
          content: 'Failed but learned',
          message: 'Failed approach with learnings',
          author_ens: 'agent.eth',
          failure_context: { failed: true, error_type: 'timeout' },
          knowledge_context: { decisions: ['Retry with exponential backoff'] },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.failure_context).toBeDefined();
      expect(body.knowledge_context).toBeDefined();
    });
  });

  describe('GET /repos/:repoId/commits/failures', () => {
    it('should search failure-tagged commits', async () => {
      const mockFailures = [
        {
          id: 'commit-f1',
          message: 'Failed attempt 1',
          failure_context: { failed: true, error_type: 'logic_error', severity: 'medium' },
        },
        {
          id: 'commit-f2',
          message: 'Failed attempt 2',
          failure_context: { failed: true, error_type: 'security_vulnerability', severity: 'high' },
        },
      ];

      (sdk.searchFailures as jest.Mock).mockResolvedValue(mockFailures);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/failures',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
      expect(sdk.searchFailures).toHaveBeenCalledWith('repo-1', {
        errorType: undefined,
        severity: undefined,
        limit: 20,
      });
    });

    it('should filter by error_type', async () => {
      (sdk.searchFailures as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/failures?error_type=logic_error',
      });

      expect(response.statusCode).toBe(200);
      expect(sdk.searchFailures).toHaveBeenCalledWith('repo-1', {
        errorType: 'logic_error',
        severity: undefined,
        limit: 20,
      });
    });

    it('should filter by severity', async () => {
      (sdk.searchFailures as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/failures?severity=high',
      });

      expect(response.statusCode).toBe(200);
      expect(sdk.searchFailures).toHaveBeenCalledWith('repo-1', {
        errorType: undefined,
        severity: 'high',
        limit: 20,
      });
    });

    it('should respect limit parameter', async () => {
      (sdk.searchFailures as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/failures?limit=5',
      });

      expect(response.statusCode).toBe(200);
      expect(sdk.searchFailures).toHaveBeenCalledWith('repo-1', {
        errorType: undefined,
        severity: undefined,
        limit: 5,
      });
    });

    it('should return 400 on SDK error', async () => {
      (sdk.searchFailures as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/failures',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Database error');
    });
  });

  // ─── Workflow Runs (v5) ───────────────────────────────────────────────────

  describe('GET /repos/:repoId/workflow-runs', () => {
    it('should return workflow runs for a repo', async () => {
      const mockRuns = [
        {
          id: 'wf-1',
          repo_id: 'repo-1',
          commit_id: 'commit-1',
          event_type: 'commit',
          status: 'passed',
          checks: [
            { name: 'security_scan', status: 'passed', severity: 'info', message: 'No issues' },
            { name: 'content_quality', status: 'passed', severity: 'info', message: 'OK' },
          ],
          summary: '2/2 checks passed',
          created_at: new Date().toISOString(),
        },
        {
          id: 'wf-2',
          repo_id: 'repo-1',
          commit_id: 'commit-2',
          event_type: 'commit',
          status: 'warning',
          checks: [
            { name: 'security_scan', status: 'warning', severity: 'warning', message: 'Found 1 issue' },
          ],
          summary: '0/1 checks passed (warnings)',
          created_at: new Date().toISOString(),
        },
      ];

      (hooks.getWorkflowRuns as jest.Mock).mockResolvedValue(mockRuns);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/workflow-runs',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(2);
      expect(body[0].status).toBe('passed');
      expect(body[1].status).toBe('warning');
      expect(hooks.getWorkflowRuns).toHaveBeenCalledWith('repo-1', 50);
    });

    it('should respect limit parameter', async () => {
      (hooks.getWorkflowRuns as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/workflow-runs?limit=10',
      });

      expect(response.statusCode).toBe(200);
      expect(hooks.getWorkflowRuns).toHaveBeenCalledWith('repo-1', 10);
    });

    it('should return 400 on error', async () => {
      (hooks.getWorkflowRuns as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/workflow-runs',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Database error');
    });
  });

  describe('GET /repos/:repoId/commits/:commitId/workflow', () => {
    it('should return workflow run for a specific commit', async () => {
      const mockRun = {
        id: 'wf-3',
        repo_id: 'repo-1',
        commit_id: 'commit-123',
        event_type: 'commit',
        status: 'failed',
        checks: [
          {
            name: 'security_scan',
            status: 'failed',
            severity: 'critical',
            message: 'Found 2 issues: 2 critical',
            details: { total_findings: 2 },
          },
          {
            name: 'content_quality',
            status: 'passed',
            severity: 'info',
            message: 'Content quality checks passed',
          },
        ],
        summary: '1/2 checks passed (security issues found)',
        created_at: new Date().toISOString(),
      };

      (hooks.getWorkflowRunForCommit as jest.Mock).mockResolvedValue(mockRun);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/commit-123/workflow',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('failed');
      expect(body.checks).toHaveLength(2);
      expect(body.checks[0].name).toBe('security_scan');
      expect(body.checks[0].status).toBe('failed');
    });

    it('should return 404 if no workflow run exists', async () => {
      (hooks.getWorkflowRunForCommit as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/commit-999/workflow',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('No workflow run found');
    });

    it('should return 400 on error', async () => {
      (hooks.getWorkflowRunForCommit as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/commits/commit-123/workflow',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Database error');
    });
  });
});
