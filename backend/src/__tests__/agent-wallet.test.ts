/**
 * Agent Wallet Routes Tests
 *
 * Tests for wallet endpoints: deposit, get wallet, set spending cap.
 */

import Fastify, { FastifyInstance } from 'fastify';
import { agentRoutes } from '../routes/agents';
import { authPlugin, generateToken } from '../middleware/auth';

// Mock SDK
jest.mock('../sdk', () => ({
  getAgent: jest.fn(),
  registerAgent: jest.fn(),
}));

// Mock database
jest.mock('../db/client', () => ({
  query: jest.fn(),
  queryOne: jest.fn(),
  pool: { end: jest.fn() },
}));

// Mock bounty service
jest.mock('../services/bounty', () => ({
  getAgentEarnings: jest.fn(),
  depositToWallet: jest.fn(),
  getWalletBalance: jest.fn(),
  getSpendingCap: jest.fn(),
  getTotalBountySpend: jest.fn(),
  getWalletTransactions: jest.fn(),
  setSpendingCap: jest.fn(),
}));

import * as sdk from '../sdk';
import * as bountyService from '../services/bounty';

describe('Agent Wallet Routes', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    app = Fastify();
    await app.register(authPlugin);
    await app.register(agentRoutes, { prefix: '/agents' });
    await app.ready();

    authToken = generateToken('user-123', 'testuser');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /agents/:ens_name/deposit ───────────────────────────────────

  describe('POST /agents/:ens_name/deposit', () => {
    it('should deposit tokens to agent wallet', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'agent.eth' });
      (bountyService.depositToWallet as jest.Mock).mockResolvedValue({
        id: 'tx-1', agent_id: 'agent-1', amount: 1000, tx_type: 'deposit',
        note: 'Initial deposit', created_at: new Date().toISOString(),
      });
      (bountyService.getWalletBalance as jest.Mock).mockResolvedValue(1000);

      const response = await app.inject({
        method: 'POST',
        url: '/agents/agent.eth/deposit',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { amount: 1000, note: 'Initial deposit' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.transaction.amount).toBe(1000);
      expect(body.wallet_balance).toBe(1000);
      expect(bountyService.depositToWallet).toHaveBeenCalledWith('agent-1', 1000, 'Initial deposit');
    });

    it('should deposit without note', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'agent.eth' });
      (bountyService.depositToWallet as jest.Mock).mockResolvedValue({
        id: 'tx-2', agent_id: 'agent-1', amount: 500, tx_type: 'deposit',
      });
      (bountyService.getWalletBalance as jest.Mock).mockResolvedValue(1500);

      const response = await app.inject({
        method: 'POST',
        url: '/agents/agent.eth/deposit',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { amount: 500 },
      });

      expect(response.statusCode).toBe(201);
      expect(bountyService.depositToWallet).toHaveBeenCalledWith('agent-1', 500, undefined);
    });

    it('should return 400 if amount is missing or zero', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/agents/agent.eth/deposit',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { amount: 0 },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('positive');
    });

    it('should return 400 if amount is negative', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/agents/agent.eth/deposit',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { amount: -100 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if agent not found', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/agents/nobody.eth/deposit',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { amount: 100 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/agents/agent.eth/deposit',
        payload: { amount: 100 },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ─── GET /agents/:ens_name/wallet ─────────────────────────────────────

  describe('GET /agents/:ens_name/wallet', () => {
    it('should return wallet info with balance, cap, and transactions', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'agent.eth' });
      (bountyService.getWalletBalance as jest.Mock).mockResolvedValue(750);
      (bountyService.getSpendingCap as jest.Mock).mockResolvedValue(2000);
      (bountyService.getTotalBountySpend as jest.Mock).mockResolvedValue(250);
      (bountyService.getWalletTransactions as jest.Mock).mockResolvedValue([
        { id: 'tx-1', amount: 1000, tx_type: 'deposit' },
        { id: 'tx-2', amount: -250, tx_type: 'bounty_post' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/agents/agent.eth/wallet',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.wallet_balance).toBe(750);
      expect(body.spending_cap).toBe(2000);
      expect(body.total_bounty_spend).toBe(250);
      expect(body.recent_transactions).toHaveLength(2);
      expect(body.ens_name).toBe('agent.eth');
    });

    it('should return wallet with null spending cap', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'agent.eth' });
      (bountyService.getWalletBalance as jest.Mock).mockResolvedValue(0);
      (bountyService.getSpendingCap as jest.Mock).mockResolvedValue(null);
      (bountyService.getTotalBountySpend as jest.Mock).mockResolvedValue(0);
      (bountyService.getWalletTransactions as jest.Mock).mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/agents/agent.eth/wallet',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.spending_cap).toBeNull();
      expect(body.wallet_balance).toBe(0);
    });

    it('should return 404 if agent not found', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/agents/nobody.eth/wallet',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ─── PATCH /agents/:ens_name/wallet ───────────────────────────────────

  describe('PATCH /agents/:ens_name/wallet', () => {
    it('should set spending cap', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'agent.eth' });
      (bountyService.setSpendingCap as jest.Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: '/agents/agent.eth/wallet',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { spending_cap: 5000 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.spending_cap).toBe(5000);
      expect(bountyService.setSpendingCap).toHaveBeenCalledWith('agent-1', 5000);
    });

    it('should remove spending cap with null', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue({ id: 'agent-1', ens_name: 'agent.eth' });
      (bountyService.setSpendingCap as jest.Mock).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: '/agents/agent.eth/wallet',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { spending_cap: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.spending_cap).toBeNull();
      expect(bountyService.setSpendingCap).toHaveBeenCalledWith('agent-1', null);
    });

    it('should return 400 if spending_cap is not provided', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/agents/agent.eth/wallet',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if spending_cap is negative', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/agents/agent.eth/wallet',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { spending_cap: -100 },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if agent not found', async () => {
      (sdk.getAgent as jest.Mock).mockResolvedValue(null);

      const response = await app.inject({
        method: 'PATCH',
        url: '/agents/nobody.eth/wallet',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { spending_cap: 1000 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 without auth', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/agents/agent.eth/wallet',
        payload: { spending_cap: 1000 },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
