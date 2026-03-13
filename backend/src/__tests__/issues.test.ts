/**
 * Issues Routes Tests
 * 
 * Tests for issue CRUD, assignment, close with judge, and submit.
 */

import Fastify, { FastifyInstance } from 'fastify';
import { issueRoutes } from '../routes/issues';
import { authPlugin, generateToken } from '../middleware/auth';

// Mock SDK
jest.mock('../sdk', () => ({
  getAgent: jest.fn(),
}));

// Mock database
jest.mock('../db/client', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  pool: { end: jest.fn() },
}));

// Mock judge service
jest.mock('../services/judge', () => ({
  judgeSubmission: jest.fn(),
  storeJudgement: jest.fn(),
}));

import * as sdk from '../sdk';
import { query, queryOne } from '../db/client';
import { judgeSubmission, storeJudgement } from '../services/judge';

describe('Issues Routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = Fastify();
    await app.register(authPlugin);
    await app.register(issueRoutes, { prefix: '/repos' });
    await app.ready();
    
    // Generate auth token for tests
    authToken = generateToken('user-123', 'testuser');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /repos/:repoId/issues', () => {
    it('should create an issue with basic fields', async () => {
      (queryOne as jest.Mock).mockResolvedValue({ id: 'repo-1' }); // Repo exists
      (query as jest.Mock).mockResolvedValue([{
        id: 'issue-123',
        repo_id: 'repo-1',
        title: 'Test Issue',
        body: 'Issue body',
        status: 'open',
        scorecard: {
          difficulty: 'medium',
          base_points: 100,
          unit_tests: [],
          bonus_criteria: [],
          bonus_points_per_criterion: 10,
          time_limit_hours: 24,
        },
        created_at: new Date().toISOString(),
      }]);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'Test Issue',
          body: 'Issue body',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Test Issue');
      expect(body.status).toBe('open');
    });

    it('should create an issue with custom scorecard', async () => {
      (queryOne as jest.Mock).mockResolvedValue({ id: 'repo-1' });
      (query as jest.Mock).mockResolvedValue([{
        id: 'issue-124',
        title: 'Hard Issue',
        scorecard: {
          difficulty: 'hard',
          base_points: 200,
          unit_tests: ['test_1', 'test_2'],
          bonus_criteria: ['performance', 'documentation'],
          bonus_points_per_criterion: 25,
          time_limit_hours: 48,
        },
        created_at: new Date().toISOString(),
      }]);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'Hard Issue',
          scorecard: {
            difficulty: 'hard',
            base_points: 200,
            unit_tests: ['test_1', 'test_2'],
            bonus_criteria: ['performance', 'documentation'],
            bonus_points_per_criterion: 25,
            time_limit_hours: 48,
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.scorecard.difficulty).toBe('hard');
      expect(body.scorecard.base_points).toBe(200);
    });

    it('should return 400 if title is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          body: 'Just a body',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues',
        payload: {
          title: 'Test Issue',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 if repo not found', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/nonexistent/issues',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'Test Issue',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /repos/:repoId/issues', () => {
    it('should list all issues', async () => {
      const mockIssues = [
        { id: 'issue-1', title: 'Issue 1', status: 'open' },
        { id: 'issue-2', title: 'Issue 2', status: 'in_progress' },
        { id: 'issue-3', title: 'Issue 3', status: 'closed' },
      ];

      (query as jest.Mock).mockResolvedValue(mockIssues);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/issues',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const mockIssues = [
        { id: 'issue-1', title: 'Open Issue', status: 'open' },
      ];

      (query as jest.Mock).mockResolvedValue(mockIssues);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/issues?status=open',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe('open');
    });
  });

  describe('GET /repos/:repoId/issues/:issueId', () => {
    it('should get issue with judgements', async () => {
      const mockIssue = {
        id: 'issue-123',
        title: 'Test Issue',
        status: 'closed',
        scorecard: { difficulty: 'medium', base_points: 100 },
      };
      const mockJudgements = [
        { id: 'j-1', points_awarded: 85, agent_ens: 'agent.eth' },
      ];

      (queryOne as jest.Mock).mockResolvedValue(mockIssue);
      (query as jest.Mock).mockResolvedValue(mockJudgements);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/issues/issue-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Test Issue');
      expect(body.judgements).toHaveLength(1);
      expect(body.judgements[0].points_awarded).toBe(85);
    });

    it('should return 404 if issue not found', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/issues/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /repos/:repoId/issues/:issueId', () => {
    it('should update issue fields', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-123',
        title: 'Old Title',
        status: 'open',
      });
      (query as jest.Mock).mockResolvedValue([{
        id: 'issue-123',
        title: 'New Title',
        status: 'open',
      }]);

      const response = await app.inject({
        method: 'PATCH',
        url: '/repos/repo-1/issues/issue-123',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'New Title',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('New Title');
    });

    it('should return 400 if no fields to update', async () => {
      (queryOne as jest.Mock).mockResolvedValue({ id: 'issue-123' });

      const response = await app.inject({
        method: 'PATCH',
        url: '/repos/repo-1/issues/issue-123',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /repos/:repoId/issues/:issueId/assign', () => {
    it('should assign an agent to issue', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'agent.eth' });
      (query as jest.Mock).mockResolvedValue([{
        id: 'issue-123',
        assigned_agent_id: 'agent-1',
        status: 'in_progress',
      }]);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-123/assign',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          agent_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('in_progress');
      expect(body.assigned_agent_id).toBe('agent-1');
    });

    it('should return 400 if agent_ens is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-123/assign',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if agent not found', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-123/assign',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          agent_ens: 'nonexistent.eth',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /repos/:repoId/issues/:issueId/close', () => {
    it('should close issue and trigger judge', async () => {
      const mockIssue = {
        id: 'issue-123',
        status: 'in_progress',
        assigned_agent_id: 'agent-1',
        scorecard: { difficulty: 'medium', base_points: 100 },
      };

      (queryOne as jest.Mock).mockResolvedValue(mockIssue);
      (query as jest.Mock)
        .mockResolvedValueOnce([{ message: 'commit 1', content_ref: 'content' }]) // commits
        .mockResolvedValueOnce([{ ...mockIssue, status: 'closed' }]); // closed issue

      (judgeSubmission as jest.Mock).mockResolvedValue({
        verdict: 'pass',
        points_awarded: 90,
        is_mock: true,
        breakdown: [],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-123/close',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.issue.status).toBe('closed');
      expect(body.judgement.verdict).toBe('pass');
      expect(body.judgement.points_awarded).toBe(90);
      expect(storeJudgement).toHaveBeenCalled();
    });

    it('should close issue with provided submission_content', async () => {
      const mockIssue = {
        id: 'issue-123',
        status: 'in_progress',
        assigned_agent_id: 'agent-1',
        scorecard: { difficulty: 'easy', base_points: 50 },
      };

      (queryOne as jest.Mock).mockResolvedValue(mockIssue);
      (query as jest.Mock).mockResolvedValue([{ ...mockIssue, status: 'closed' }]);

      (judgeSubmission as jest.Mock).mockResolvedValue({
        verdict: 'pass',
        points_awarded: 50,
        is_mock: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-123/close',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          submission_content: 'My custom submission',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(judgeSubmission).toHaveBeenCalledWith(
        'issue-123',
        'agent-1',
        'My custom submission',
        expect.any(Object)
      );
    });

    it('should return 400 if issue already closed', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-123',
        status: 'closed',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-123/close',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if no agent assigned', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-123',
        status: 'open',
        assigned_agent_id: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-123/close',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /repos/:repoId/issues/:issueId/submit', () => {
    it('should submit and judge agent solution', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'agent.eth' });
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-123',
        status: 'in_progress',
        scorecard: { difficulty: 'medium', base_points: 100 },
      });

      (judgeSubmission as jest.Mock).mockResolvedValue({
        verdict: 'pass',
        points_awarded: 95,
        is_mock: true,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-123/submit',
        payload: {
          agent_ens: 'agent.eth',
          content: 'My solution content',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.judgement.verdict).toBe('pass');
      expect(body.judgement.points_awarded).toBe(95);
    });

    it('should return 400 if content is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-123/submit',
        payload: {
          agent_ens: 'agent.eth',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if issue is closed', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1' });
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-123',
        status: 'closed',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-123/submit',
        payload: {
          agent_ens: 'agent.eth',
          content: 'My solution',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
