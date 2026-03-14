/**
 * Bounty Lifecycle Integration Test
 *
 * Tests the full competitive bounty flow end-to-end using mocked DB,
 * but exercising the real route-to-service wiring:
 *
 * 1. Register poster + solver agents
 * 2. Deposit to poster's wallet
 * 3. Post bounty on issue
 * 4. Solver submits solution
 * 5. Trigger judging
 * 6. Verify winner awarded + poster wallet debited
 *
 * Also tests: cancel flow, refund on expiry, max_submissions auto-judge.
 */

import Fastify, { FastifyInstance } from 'fastify';
import { issueRoutes } from '../../routes/issues';
import { agentRoutes } from '../../routes/agents';
import { authPlugin, generateToken } from '../../middleware/auth';

// Mock SDK
jest.mock('../../sdk', () => ({
  getAgent: jest.fn(),
  registerAgent: jest.fn(),
}));

// Mock database
jest.mock('../../db/client', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  pool: { end: jest.fn() },
}));

// Mock bounty service
jest.mock('../../services/bounty', () => ({
  getAgentEarnings: jest.fn().mockResolvedValue(0),
  depositToWallet: jest.fn(),
  getWalletBalance: jest.fn(),
  setSpendingCap: jest.fn(),
  getSpendingCap: jest.fn(),
  getTotalBountySpend: jest.fn(),
  getWalletTransactions: jest.fn(),
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
jest.mock('../../services/judge', () => ({
  judgeSubmission: jest.fn(),
  storeJudgement: jest.fn(),
  judgeAllSubmissions: jest.fn(),
}));

import * as sdk from '../../sdk';
import { query, queryOne } from '../../db/client';
import * as bountyService from '../../services/bounty';
import { judgeAllSubmissions } from '../../services/judge';

describe('Bounty Lifecycle Integration', () => {
  let app: FastifyInstance;
  let authToken: string;

  const mockScorecard = {
    difficulty: 'medium',
    base_points: 100,
    unit_tests: ['test_1'],
    bonus_criteria: ['perf'],
    bonus_points_per_criterion: 10,
    time_limit_hours: 24,
  };

  const posterAgent = { id: 'agent-poster', ens_name: 'poster.eth' };
  const solverA = { id: 'agent-solver-a', ens_name: 'solver-a.eth' };
  const solverB = { id: 'agent-solver-b', ens_name: 'solver-b.eth' };

  const mockIssue = {
    id: 'issue-lifecycle', repo_id: 'repo-1', title: 'Lifecycle issue',
    status: 'open', scorecard: mockScorecard,
  };

  beforeAll(async () => {
    app = Fastify();
    await app.register(authPlugin);
    await app.register(agentRoutes, { prefix: '/agents' });
    await app.register(issueRoutes, { prefix: '/repos' });
    await app.ready();

    authToken = generateToken('user-1', 'alice');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full lifecycle: deposit -> post bounty -> submit -> judge -> award', async () => {
    // Step 1: Deposit to poster's wallet
    (sdk.getAgent as jest.Mock).mockResolvedValue(posterAgent);
    (bountyService.depositToWallet as jest.Mock).mockResolvedValue({
      id: 'tx-1', agent_id: posterAgent.id, amount: 1000, tx_type: 'deposit',
    });
    (bountyService.getWalletBalance as jest.Mock).mockResolvedValue(1000);

    const depositRes = await app.inject({
      method: 'POST',
      url: '/agents/poster.eth/deposit',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { amount: 1000 },
    });
    expect(depositRes.statusCode).toBe(201);
    expect(JSON.parse(depositRes.body).wallet_balance).toBe(1000);

    // Step 2: Post bounty on issue
    (queryOne as jest.Mock).mockResolvedValue(mockIssue);
    (sdk.getAgent as jest.Mock).mockResolvedValue(posterAgent);
    const futureDL = new Date(Date.now() + 86400000).toISOString();
    (bountyService.postIssueBounty as jest.Mock).mockResolvedValue({
      id: 'bounty-lc', issue_id: 'issue-lifecycle', poster_agent_id: posterAgent.id,
      amount: 500, deadline: futureDL, max_submissions: 3, status: 'funded',
    });

    const postRes = await app.inject({
      method: 'POST',
      url: '/repos/repo-1/issues/issue-lifecycle/bounty',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { agent_ens: 'poster.eth', amount: 500, deadline_hours: 24 },
    });
    expect(postRes.statusCode).toBe(201);
    expect(JSON.parse(postRes.body).status).toBe('funded');

    // Step 3: Solver A submits
    (sdk.getAgent as jest.Mock).mockResolvedValue(solverA);
    (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
      id: 'bounty-lc', issue_id: 'issue-lifecycle', poster_agent_id: posterAgent.id,
      amount: 500, status: 'funded', max_submissions: 3,
      deadline: futureDL,
    });
    (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(0);
    (bountyService.submitToBounty as jest.Mock).mockResolvedValue({
      id: 'sub-a', bounty_id: 'bounty-lc', agent_id: solverA.id, content: 'Solution A',
    });

    const subARes = await app.inject({
      method: 'POST',
      url: '/repos/repo-1/issues/issue-lifecycle/bounty-submit',
      payload: { agent_ens: 'solver-a.eth', content: 'Solution A' },
    });
    expect(subARes.statusCode).toBe(201);
    expect(JSON.parse(subARes.body).submission_count).toBe(1);

    // Step 4: Solver B submits
    (sdk.getAgent as jest.Mock).mockResolvedValue(solverB);
    (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(1);
    (bountyService.submitToBounty as jest.Mock).mockResolvedValue({
      id: 'sub-b', bounty_id: 'bounty-lc', agent_id: solverB.id, content: 'Solution B',
    });

    const subBRes = await app.inject({
      method: 'POST',
      url: '/repos/repo-1/issues/issue-lifecycle/bounty-submit',
      payload: { agent_ens: 'solver-b.eth', content: 'Solution B' },
    });
    expect(subBRes.statusCode).toBe(201);
    expect(JSON.parse(subBRes.body).submission_count).toBe(2);

    // Step 5: Trigger judging — Solver A wins
    (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
      id: 'bounty-lc', issue_id: 'issue-lifecycle', status: 'funded',
      amount: 500, poster_agent_id: posterAgent.id,
    });
    (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(2);
    (queryOne as jest.Mock).mockResolvedValue(mockIssue);
    (judgeAllSubmissions as jest.Mock).mockResolvedValue({
      results: [
        { agent_id: solverA.id, points_awarded: 95, is_mock: true, verdict: {} },
        { agent_id: solverB.id, points_awarded: 72, is_mock: true, verdict: {} },
      ],
      winner: { agent_id: solverA.id, points_awarded: 95 },
    });
    (bountyService.getIssueBountyById as jest.Mock).mockResolvedValue({
      id: 'bounty-lc', amount: 500,
    });
    (bountyService.awardIssueBounty as jest.Mock).mockResolvedValue(undefined);

    const judgeRes = await app.inject({
      method: 'POST',
      url: '/repos/repo-1/issues/issue-lifecycle/bounty-judge',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(judgeRes.statusCode).toBe(200);
    const judgeBody = JSON.parse(judgeRes.body);
    expect(judgeBody.status).toBe('awarded');
    expect(judgeBody.winner.agent_id).toBe(solverA.id);
    expect(judgeBody.results).toHaveLength(2);
    expect(bountyService.awardIssueBounty).toHaveBeenCalledWith('bounty-lc', solverA.id, 500);
  });

  it('should handle cancel flow: post -> cancel (no submissions)', async () => {
    // Post bounty
    (queryOne as jest.Mock).mockResolvedValue(mockIssue);
    (sdk.getAgent as jest.Mock).mockResolvedValue(posterAgent);
    const futureDL = new Date(Date.now() + 86400000).toISOString();
    (bountyService.postIssueBounty as jest.Mock).mockResolvedValue({
      id: 'bounty-cancel', issue_id: 'issue-lifecycle', poster_agent_id: posterAgent.id,
      amount: 200, deadline: futureDL, max_submissions: 5, status: 'funded',
    });

    const postRes = await app.inject({
      method: 'POST',
      url: '/repos/repo-1/issues/issue-lifecycle/bounty',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { agent_ens: 'poster.eth', amount: 200, deadline_hours: 24 },
    });
    expect(postRes.statusCode).toBe(201);

    // Cancel
    (sdk.getAgent as jest.Mock).mockResolvedValue(posterAgent);
    (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
      id: 'bounty-cancel', poster_agent_id: posterAgent.id, status: 'funded',
    });
    (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(0);
    (bountyService.refundIssueBounty as jest.Mock).mockResolvedValue(undefined);

    const cancelRes = await app.inject({
      method: 'DELETE',
      url: '/repos/repo-1/issues/issue-lifecycle/bounty',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { agent_ens: 'poster.eth' },
    });
    expect(cancelRes.statusCode).toBe(200);
    expect(JSON.parse(cancelRes.body).status).toBe('cancelled');
    expect(bountyService.refundIssueBounty).toHaveBeenCalledWith('bounty-cancel');
  });

  it('should handle expiry refund: expired bounty with no submissions', async () => {
    const expiredBounty = {
      id: 'bounty-expired', issue_id: 'issue-lifecycle', poster_agent_id: posterAgent.id,
      status: 'funded', deadline: new Date(Date.now() - 86400000).toISOString(),
    };
    const refundedBounty = { ...expiredBounty, status: 'cancelled' };

    (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(expiredBounty);
    (bountyService.checkBountyExpiry as jest.Mock).mockResolvedValue('needs_refund');
    (bountyService.refundIssueBounty as jest.Mock).mockResolvedValue(undefined);
    (bountyService.getIssueBountyById as jest.Mock).mockResolvedValue(refundedBounty);

    const getRes = await app.inject({
      method: 'GET',
      url: '/repos/repo-1/issues/issue-lifecycle/bounty',
    });
    expect(getRes.statusCode).toBe(200);
    const body = JSON.parse(getRes.body);
    expect(body.status).toBe('cancelled');
    expect(bountyService.refundIssueBounty).toHaveBeenCalledWith('bounty-expired');
  });

  it('should handle judge with no winner (all scored 0) -> refund', async () => {
    (bountyService.getIssueBounty as jest.Mock).mockResolvedValue({
      id: 'bounty-no-winner', issue_id: 'issue-lifecycle', status: 'funded',
      amount: 300, poster_agent_id: posterAgent.id,
    });
    (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(1);
    (queryOne as jest.Mock).mockResolvedValue(mockIssue);
    (judgeAllSubmissions as jest.Mock).mockResolvedValue({
      results: [{ agent_id: solverA.id, points_awarded: 0, is_mock: true, verdict: {} }],
      winner: null,
    });
    (bountyService.refundIssueBounty as jest.Mock).mockResolvedValue(undefined);

    const judgeRes = await app.inject({
      method: 'POST',
      url: '/repos/repo-1/issues/issue-lifecycle/bounty-judge',
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(judgeRes.statusCode).toBe(200);
    const body = JSON.parse(judgeRes.body);
    expect(body.status).toBe('refunded');
    expect(body.winner).toBeNull();
    expect(bountyService.refundIssueBounty).toHaveBeenCalled();
  });

  it('should auto-trigger judging when last submission fills max_submissions', async () => {
    const bountyAtLimit = {
      id: 'bounty-auto', issue_id: 'issue-lifecycle', poster_agent_id: posterAgent.id,
      amount: 400, status: 'funded', max_submissions: 1,
      deadline: new Date(Date.now() + 86400000).toISOString(),
    };

    (sdk.getAgent as jest.Mock).mockResolvedValue(solverA);
    (bountyService.getIssueBounty as jest.Mock).mockResolvedValue(bountyAtLimit);
    (bountyService.getBountySubmissionCount as jest.Mock).mockResolvedValue(0);
    (bountyService.submitToBounty as jest.Mock).mockResolvedValue({
      id: 'sub-auto', bounty_id: 'bounty-auto', agent_id: solverA.id, content: 'Only solution',
    });
    (queryOne as jest.Mock).mockResolvedValue(mockIssue);
    (judgeAllSubmissions as jest.Mock).mockResolvedValue({
      results: [{ agent_id: solverA.id, points_awarded: 85, is_mock: true }],
      winner: { agent_id: solverA.id, points_awarded: 85 },
    });
    (bountyService.getIssueBountyById as jest.Mock).mockResolvedValue({ ...bountyAtLimit, amount: 400 });
    (bountyService.awardIssueBounty as jest.Mock).mockResolvedValue(undefined);

    const subRes = await app.inject({
      method: 'POST',
      url: '/repos/repo-1/issues/issue-lifecycle/bounty-submit',
      payload: { agent_ens: 'solver-a.eth', content: 'Only solution' },
    });
    expect(subRes.statusCode).toBe(201);
    expect(JSON.parse(subRes.body).judging_triggered).toBe(true);

    // Auto-judging is async (fire-and-forget), so we need to wait briefly
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify judging was triggered
    expect(judgeAllSubmissions).toHaveBeenCalledWith('bounty-auto', mockScorecard);
  });

  it('should allow wallet operations: deposit + get wallet + set cap', async () => {
    // Deposit
    (sdk.getAgent as jest.Mock).mockResolvedValue(posterAgent);
    (bountyService.depositToWallet as jest.Mock).mockResolvedValue({
      id: 'tx-wl', agent_id: posterAgent.id, amount: 2000, tx_type: 'deposit',
    });
    (bountyService.getWalletBalance as jest.Mock).mockResolvedValue(2000);

    const depRes = await app.inject({
      method: 'POST',
      url: '/agents/poster.eth/deposit',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { amount: 2000 },
    });
    expect(depRes.statusCode).toBe(201);

    // Get wallet
    (sdk.getAgent as jest.Mock).mockResolvedValue(posterAgent);
    (bountyService.getWalletBalance as jest.Mock).mockResolvedValue(2000);
    (bountyService.getSpendingCap as jest.Mock).mockResolvedValue(null);
    (bountyService.getTotalBountySpend as jest.Mock).mockResolvedValue(0);
    (bountyService.getWalletTransactions as jest.Mock).mockResolvedValue([
      { id: 'tx-wl', amount: 2000, tx_type: 'deposit' },
    ]);

    const walletRes = await app.inject({
      method: 'GET',
      url: '/agents/poster.eth/wallet',
    });
    expect(walletRes.statusCode).toBe(200);
    const wallet = JSON.parse(walletRes.body);
    expect(wallet.wallet_balance).toBe(2000);
    expect(wallet.spending_cap).toBeNull();

    // Set spending cap
    (sdk.getAgent as jest.Mock).mockResolvedValue(posterAgent);
    (bountyService.setSpendingCap as jest.Mock).mockResolvedValue(undefined);

    const capRes = await app.inject({
      method: 'PATCH',
      url: '/agents/poster.eth/wallet',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { spending_cap: 5000 },
    });
    expect(capRes.statusCode).toBe(200);
    expect(JSON.parse(capRes.body).spending_cap).toBe(5000);
    expect(bountyService.setSpendingCap).toHaveBeenCalledWith(posterAgent.id, 5000);
  });
});
