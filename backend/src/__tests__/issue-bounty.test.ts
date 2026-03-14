/**
 * Issue Bounty Routes Tests
 *
 * Tests for the competitive bounty endpoints on issues:
 * POST bounty, GET bounty, POST bounty-submit, POST bounty-judge, DELETE bounty.
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

// Mock bounty service
jest.mock('../services/bounty', () => ({
  postIssueBounty: jest.fn(),
  getIssueBounty: jest.fn(),
  getIssueBountyById: jest.fn(),
  submitToBounty: jest.fn(),
  getIssueBountySubmissions: jest.fn(),
  getBountySubmissionCount: jest.fn(),
  awardIssueBounty: jest.fn(),
  refundIssueBounty: jest.fn(),
  checkBountyExpiry: jest.fn(),
}));

// Mock judge service
jest.mock('../services/judge', () => ({
  judgeSubmission: jest.fn(),
  storeJudgement: jest.fn(),
  judgeAllSubmissions: jest.fn(),
}));

import * as sdk from '../sdk';
import { query, queryOne } from '../db/client';
import * as bountyService from '../services/bounty';
import { judgeAllSubmissions } from '../services/judge';

describe('Issue Bounty Routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  const mockScorecard = {
    difficulty: 'medium',
    base_points: 100,
    unit_tests: [],
    bonus_criteria: [],
    bonus_points_per_criterion: 10,
    time_limit_hours: 24,
  };

  beforeAll(async () => {
    app = Fastify();
    await app.register(authPlugin);
    await app.register(issueRoutes, { prefix: '/repos' });
    await app.ready();

    authToken = generateToken('user-123', 'testuser');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /:repoId/issues/:issueId/bounty ─────────────────────────────

  describe('POST /repos/:repoId/issues/:issueId/bounty', () => {
    it('should post a bounty on an issue', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-1', repo_id: 'repo-1', status: 'open', scorecard: mockScorecard,
      });
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-poster', ens_name: 'poster.eth' });
      (bountyService.postIssueBounty as jest.Mock).mockResolvedValue({
        id: 'bounty-1', issue_id: 'issue-1', poster_agent_id: 'agent-poster',
        amount: 500, deadline: new Date(Date.now() + 86400000).toISOString(),
        max_submissions: 5, status: 'funded',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth', amount: 500, deadline_hours: 24 },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('bounty-1');
      expect(body.status).toBe('funded');
      expect(body.amount).toBe(500);
      expect(bountyService.postIssueBounty).toHaveBeenCalledWith(
        'issue-1', 'agent-poster', 500, expect.any(Date), 5
      );
    });

    it('should accept custom max_submissions', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-1', repo_id: 'repo-1', status: 'open', scorecard: mockScorecard,
      });
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-poster', ens_name: 'poster.eth' });
      (bountyService.postIssueBounty as jest.Mock).mockResolvedValue({
        id: 'bounty-2', issue_id: 'issue-1', max_submissions: 3, status: 'funded',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth', amount: 200, deadline_hours: 12, max_submissions: 3 },
      });

      expect(response.statusCode).toBe(201);
      expect(bountyService.postIssueBounty).toHaveBeenCalledWith(
        'issue-1', 'agent-poster', 200, expect.any(Date), 3
      );
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('required');
    });

    it('should return 400 if amount is zero', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth', amount: 0, deadline_hours: 24 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if amount is negative', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth', amount: -50, deadline_hours: 24 },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('positive');
    });

    it('should return 400 if deadline_hours is negative', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth', amount: 100, deadline_hours: -5 },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('positive');
    });

    it('should return 404 if issue not found', async () => {
      (queryOne as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/nonexistent/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth', amount: 100, deadline_hours: 24 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if issue is closed', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-1', repo_id: 'repo-1', status: 'closed',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth', amount: 100, deadline_hours: 24 },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('closed');
    });

    it('should return 404 if agent not found', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-1', repo_id: 'repo-1', status: 'open',
      });
      (sdk.getAgent as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'nobody.eth', amount: 100, deadline_hours: 24 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if bountyService.postIssueBounty throws (e.g. insufficient funds)', async () => {
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-1', repo_id: 'repo-1', status: 'open',
      });
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'agent.eth' });
      (bountyService.postIssueBounty as jest.Mock).mockRejectedValue(
        new Error('Insufficient wallet balance')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'agent.eth', amount: 99999, deadline_hours: 24 },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('Insufficient');
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty',
        payload: { agent_ens: 'poster.eth', amount: 100, deadline_hours: 24 },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── GET /:repoId/issues/:issueId/bounty ──────────────────────────────

  describe('GET /repos/:repoId/issues/:issueId/bounty', () => {
    it('should return bounty with submissions', async () => {
      const mockBounty = {
        id: 'bounty-1', issue_id: 'issue-1', poster_agent_id: 'agent-poster',
        amount: 500, status: 'funded', max_submissions: 5,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      };
      const mockSubmissions = [
        { id: 'sub-1', bounty_id: 'bounty-1', agent_id: 'agent-2', content: 'fix' },
      ];

      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(mockBounty);
      (bountyService.getIssueBountySubmissions as jest.Mock).mockResolvedValue(mockSubmissions);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/issues/issue-1/bounty',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('bounty-1');
      expect(body.submissions).toHaveLength(1);
      expect(body.submission_count).toBe(1);
    });

    it('should return 404 if no bounty exists', async () => {
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/issues/issue-1/bounty',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should trigger lazy refund if bounty expired with no submissions', async () => {
      const expiredBounty = {
        id: 'bounty-exp', issue_id: 'issue-1', status: 'funded',
        deadline: new Date(Date.now() - 86400000).toISOString(),
      };
      const refundedBounty = { ...expiredBounty, status: 'cancelled' };

      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(expiredBounty);
      (bountyService.checkBountyExpiry as jest.Mock).mockResolvedValue('needs_refund');
      (bountyService.refundIssueBounty as jest.Mock).mockResolvedValue(undefined);
      (bountyService.getIssueBountyById as jest.Mock).mockResolvedValue(refundedBounty);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/issues/issue-1/bounty',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('cancelled');
      expect(bountyService.refundIssueBounty).toHaveBeenCalledWith('bounty-exp');
    });

    it('should not trigger refund if bounty is still active', async () => {
      const activeBounty = {
        id: 'bounty-active', issue_id: 'issue-1', status: 'funded',
        deadline: new Date(Date.now() + 86400000).toISOString(),
      };

      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(activeBounty);
      (bountyService.checkBountyExpiry as jest.Mock).mockResolvedValue('active');
      (bountyService.getIssueBountySubmissions as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/repos/repo-1/issues/issue-1/bounty',
      });

      expect(response.statusCode).toBe(200);
      expect(bountyService.refundIssueBounty).not.toHaveBeenCalled();
    });
  });

  // ─── POST /:repoId/issues/:issueId/bounty-submit ─────────────────────

  describe('POST /repos/:repoId/issues/:issueId/bounty-submit', () => {
    const fundedBounty = {
      id: 'bounty-1', issue_id: 'issue-1', poster_agent_id: 'agent-poster',
      amount: 500, status: 'funded', max_submissions: 5,
      deadline: new Date(Date.now() + 86400000).toISOString(),
    };

    it('should submit a solution to a bounty', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-solver', ens_name: 'solver.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(fundedBounty);
      (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(1);
      (bountyService.submitToBounty as jest.Mock).mockResolvedValue({
        id: 'sub-1', bounty_id: 'bounty-1', agent_id: 'agent-solver', content: 'fix here',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-submit',
        payload: { agent_ens: 'solver.eth', content: 'fix here' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.submission.id).toBe('sub-1');
      expect(body.submission_count).toBe(2);
      expect(body.judging_triggered).toBe(false);
    });

    it('should return 400 if agent_ens or content is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-submit',
        payload: { agent_ens: 'solver.eth' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if agent not found', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-submit',
        payload: { agent_ens: 'nobody.eth', content: 'solution' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if no bounty on issue', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'a.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-submit',
        payload: { agent_ens: 'a.eth', content: 'solution' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if bounty is not funded', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'a.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
        ...fundedBounty, status: 'awarded',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-submit',
        payload: { agent_ens: 'a.eth', content: 'solution' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('not accepting');
    });

    it('should return 400 if deadline has passed', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'a.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
        ...fundedBounty,
        deadline: new Date(Date.now() - 86400000).toISOString(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-submit',
        payload: { agent_ens: 'a.eth', content: 'solution' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('deadline');
    });

    it('should return 400 if poster submits to own bounty', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-poster', ens_name: 'poster.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(fundedBounty);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-submit',
        payload: { agent_ens: 'poster.eth', content: 'my own solution' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('poster');
    });

    it('should return 400 if max submissions reached', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-solver', ens_name: 'solver.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(fundedBounty);
      (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(5);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-submit',
        payload: { agent_ens: 'solver.eth', content: 'solution' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('Maximum');
    });

    it('should return 409 on duplicate submission', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-solver', ens_name: 'solver.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(fundedBounty);
      (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(1);
      (bountyService.submitToBounty as jest.Mock).mockRejectedValue(
        new Error('duplicate key value violates unique constraint')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-submit',
        payload: { agent_ens: 'solver.eth', content: 'solution again' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should trigger auto-judging when max_submissions reached', async () => {
      const bountyAtLimit = { ...fundedBounty, max_submissions: 2 };
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-solver', ens_name: 'solver.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(bountyAtLimit);
      (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(1); // will become 2
      (bountyService.submitToBounty as jest.Mock).mockResolvedValue({
        id: 'sub-2', bounty_id: 'bounty-1', agent_id: 'agent-solver', content: 'solution',
      });
      // For auto-judging: the route fetches the issue to get its scorecard
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-1', scorecard: mockScorecard,
      });
      // Mock judgeAllSubmissions (called by triggerBountyJudging)
      (judgeAllSubmissions as jest.Mock).mockResolvedValue({
        results: [{ agent_id: 'agent-solver', points_awarded: 80, is_mock: true }],
        winner: { agent_id: 'agent-solver', points_awarded: 80 },
      });
      (bountyService.getIssueBountyById as jest.Mock).mockResolvedValue({
        ...bountyAtLimit, amount: 500,
      });
      (bountyService.awardIssueBounty as jest.Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-submit',
        payload: { agent_ens: 'solver.eth', content: 'solution' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.judging_triggered).toBe(true);
    });
  });

  // ─── POST /:repoId/issues/:issueId/bounty-judge ──────────────────────

  describe('POST /repos/:repoId/issues/:issueId/bounty-judge', () => {
    it('should judge all submissions and award winner', async () => {
      const bounty = {
        id: 'bounty-1', issue_id: 'issue-1', status: 'funded',
        amount: 500, poster_agent_id: 'agent-poster',
      };
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(bounty);
      (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(2);
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-1', repo_id: 'repo-1', scorecard: mockScorecard,
      });
      (judgeAllSubmissions as jest.Mock).mockResolvedValue({
        results: [
          { agent_id: 'agent-a', points_awarded: 90, is_mock: true, verdict: {} },
          { agent_id: 'agent-b', points_awarded: 70, is_mock: true, verdict: {} },
        ],
        winner: { agent_id: 'agent-a', points_awarded: 90 },
      });
      (bountyService.getIssueBountyById as jest.Mock).mockResolvedValue({ ...bounty, amount: 500 });
      (bountyService.awardIssueBounty as jest.Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-judge',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('awarded');
      expect(body.winner.agent_id).toBe('agent-a');
      expect(body.results).toHaveLength(2);
      expect(bountyService.awardIssueBounty).toHaveBeenCalledWith('bounty-1', 'agent-a', 500);
    });

    it('should refund if no submissions', async () => {
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
        id: 'bounty-1', status: 'funded',
      });
      (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(0);
      (bountyService.refundIssueBounty as jest.Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-judge',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('refunded');
      expect(bountyService.refundIssueBounty).toHaveBeenCalled();
    });

    it('should refund if all submissions scored 0', async () => {
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
        id: 'bounty-1', status: 'funded',
      });
      (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(1);
      (queryOne as jest.Mock).mockResolvedValue({
        id: 'issue-1', repo_id: 'repo-1', scorecard: mockScorecard,
      });
      (judgeAllSubmissions as jest.Mock).mockResolvedValue({
        results: [{ agent_id: 'agent-a', points_awarded: 0, is_mock: true, verdict: {} }],
        winner: null,
      });
      (bountyService.refundIssueBounty as jest.Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-judge',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('refunded');
      expect(body.winner).toBeNull();
    });

    it('should return 404 if no bounty found', async () => {
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-judge',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if bounty already awarded', async () => {
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
        id: 'bounty-1', status: 'awarded',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-judge',
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/repos/repo-1/issues/issue-1/bounty-judge',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── DELETE /:repoId/issues/:issueId/bounty ───────────────────────────

  describe('DELETE /repos/:repoId/issues/:issueId/bounty', () => {
    it('should cancel bounty with no submissions', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-poster', ens_name: 'poster.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
        id: 'bounty-1', poster_agent_id: 'agent-poster', status: 'funded',
      });
      (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(0);
      (bountyService.refundIssueBounty as jest.Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('cancelled');
      expect(bountyService.refundIssueBounty).toHaveBeenCalledWith('bounty-1');
    });

    it('should return 400 if agent_ens is missing', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 if non-poster tries to cancel', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-other', ens_name: 'other.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
        id: 'bounty-1', poster_agent_id: 'agent-poster', status: 'funded',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'other.eth' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 if bounty has submissions', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-poster', ens_name: 'poster.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
        id: 'bounty-1', poster_agent_id: 'agent-poster', status: 'funded',
      });
      (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(2);

      const response = await app.inject({
        method: 'DELETE',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('existing submissions');
    });

    it('should return 400 if bounty is not funded (already awarded)', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-poster', ens_name: 'poster.eth' });
      (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
        id: 'bounty-1', poster_agent_id: 'agent-poster', status: 'awarded',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/repos/repo-1/issues/issue-1/bounty',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { agent_ens: 'poster.eth' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/repos/repo-1/issues/issue-1/bounty',
        payload: { agent_ens: 'poster.eth' },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
