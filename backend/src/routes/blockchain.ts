/**
 * Blockchain Routes
 * 
 * Agent registration with ABT deposit verification.
 */

import { FastifyInstance } from 'fastify';
import { query, queryOne } from '../db/client';
import { requireAuth } from '../middleware/auth';
import {
  verifyDepositTransaction,
  isBlockchainEnabled,
  getTokenInfo,
  getRequiredDeposit,
  getTreasuryAddress,
  generateMockTxHash,
} from '../services/blockchain';
import { validateEnsName } from '../services/ens';

interface Agent {
  id: string;
  ens_name: string;
  role: string;
  capabilities: string[];
  reputation_score: number;
  user_id: string | null;
  deposit_tx_hash: string | null;
  deposit_verified: boolean;
  created_at: string;
}

export async function blockchainRoutes(app: FastifyInstance) {
  /**
   * Get blockchain configuration
   */
  app.get('/config', async (_req, reply) => {
    const tokenInfo = await getTokenInfo();

    return {
      enabled: isBlockchainEnabled(),
      required_deposit: getRequiredDeposit(),
      treasury_address: getTreasuryAddress(),
      token: tokenInfo,
      network: 'sepolia',
      chain_id: 11155111,
    };
  });

  /**
   * Register agent with deposit
   * 
   * Requires authentication and a valid ABT deposit transaction.
   */
  app.post('/register-agent', { preHandler: requireAuth }, async (req, reply) => {
    const {
      ens_name,
      role,
      capabilities,
      tx_hash,
      wallet_address,
    } = req.body as any;

    // Validation
    if (!ens_name || !tx_hash || !wallet_address) {
      return reply.status(400).send({
        error: 'Validation failed',
        message: 'ens_name, tx_hash, and wallet_address are required',
      });
    }

    if (!validateEnsName(ens_name)) {
      return reply.status(400).send({
        error: 'Validation failed',
        message: 'Invalid ENS name format. Must be lowercase alphanumeric with .eth suffix',
      });
    }

    // Check if agent already exists
    const existing = await queryOne<Agent>(
      'SELECT * FROM agents WHERE ens_name = $1',
      [ens_name]
    );

    if (existing) {
      // If already verified, reject
      if (existing.deposit_verified) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'Agent already registered and verified',
        });
      }

      // If owned by different user, reject
      if (existing.user_id && existing.user_id !== req.user!.userId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Agent is claimed by another user',
        });
      }
    }

    // Check if tx_hash already used
    const txUsed = await queryOne(
      'SELECT id FROM agents WHERE deposit_tx_hash = $1',
      [tx_hash]
    );

    if (txUsed) {
      return reply.status(400).send({
        error: 'Validation failed',
        message: 'Transaction hash already used for another agent',
      });
    }

    // Verify deposit transaction
    const verification = await verifyDepositTransaction(tx_hash, wallet_address);

    if (!verification.verified) {
      return reply.status(400).send({
        error: 'Verification failed',
        message: verification.error || 'Deposit verification failed',
        details: verification,
      });
    }

    // Create or update agent
    let agent: Agent;

    if (existing) {
      // Update existing unverified agent
      const [updated] = await query<Agent>(
        `UPDATE agents 
         SET user_id = $1, deposit_tx_hash = $2, deposit_verified = true,
             role = COALESCE($3, role), capabilities = COALESCE($4, capabilities)
         WHERE ens_name = $5
         RETURNING *`,
        [req.user!.userId, tx_hash, role, capabilities, ens_name]
      );
      agent = updated;
    } else {
      // Create new agent
      const [created] = await query<Agent>(
        `INSERT INTO agents (ens_name, role, capabilities, user_id, deposit_tx_hash, deposit_verified)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [ens_name, role || 'agent', capabilities || [], req.user!.userId, tx_hash]
      );
      agent = created;
    }

    return reply.status(201).send({
      message: 'Agent registered successfully',
      agent,
      verification: {
        tx_hash: verification.txHash,
        amount: verification.amountFormatted,
        block: verification.blockNumber,
      },
    });
  });

  /**
   * Verify an existing agent's deposit
   * 
   * For agents that were created before deposit verification was required.
   */
  app.post('/verify-deposit', { preHandler: requireAuth }, async (req, reply) => {
    const { ens_name, tx_hash, wallet_address } = req.body as any;

    if (!ens_name || !tx_hash || !wallet_address) {
      return reply.status(400).send({
        error: 'Validation failed',
        message: 'ens_name, tx_hash, and wallet_address are required',
      });
    }

    // Find agent
    const agent = await queryOne<Agent>(
      'SELECT * FROM agents WHERE ens_name = $1',
      [ens_name]
    );

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    if (agent.deposit_verified) {
      return reply.status(400).send({
        error: 'Already verified',
        message: 'Agent deposit is already verified',
      });
    }

    // Check ownership
    if (agent.user_id && agent.user_id !== req.user!.userId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'You do not own this agent',
      });
    }

    // Verify transaction
    const verification = await verifyDepositTransaction(tx_hash, wallet_address);

    if (!verification.verified) {
      return reply.status(400).send({
        error: 'Verification failed',
        message: verification.error,
        details: verification,
      });
    }

    // Update agent
    const [updated] = await query<Agent>(
      `UPDATE agents 
       SET deposit_tx_hash = $1, deposit_verified = true, user_id = $2
       WHERE ens_name = $3
       RETURNING *`,
      [tx_hash, req.user!.userId, ens_name]
    );

    return {
      message: 'Deposit verified successfully',
      agent: updated,
      verification: {
        tx_hash: verification.txHash,
        amount: verification.amountFormatted,
        block: verification.blockNumber,
      },
    };
  });

  /**
   * Generate mock transaction hash (for testing/demo)
   */
  app.post('/mock-tx', async (_req, reply) => {
    if (isBlockchainEnabled()) {
      return reply.status(400).send({
        error: 'Not available',
        message: 'Mock transactions not available when blockchain is enabled',
      });
    }

    const txHash = generateMockTxHash();

    return {
      tx_hash: txHash,
      note: 'This is a mock transaction hash for testing purposes',
    };
  });

  /**
   * Check deposit status for an agent
   */
  app.get('/deposit-status/:ensName', async (req, reply) => {
    const { ensName } = req.params as any;

    const agent = await queryOne<Agent>(
      'SELECT ens_name, deposit_tx_hash, deposit_verified FROM agents WHERE ens_name = $1',
      [ensName]
    );

    if (!agent) {
      return reply.status(404).send({ error: 'Agent not found' });
    }

    return {
      ens_name: agent.ens_name,
      deposit_verified: agent.deposit_verified,
      tx_hash: agent.deposit_tx_hash,
      required_deposit: getRequiredDeposit(),
    };
  });
}
