/**
 * Blockchain Service
 * 
 * Verifies ABT (AgentBranchToken) deposits on Sepolia testnet.
 * Uses ethers.js v6 to interact with the blockchain.
 */

import { ethers, JsonRpcProvider, Contract } from 'ethers';

// ─── Configuration ────────────────────────────────────────────────────────────

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const ABT_CONTRACT_ADDRESS = process.env.ABT_CONTRACT_ADDRESS;
const REQUIRED_DEPOSIT = BigInt(process.env.AGENT_DEPOSIT_AMOUNT || '50') * BigInt(10 ** 18);

// ERC-20 Transfer event ABI
const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
];

// Treasury address where deposits are sent
const TREASURY_ADDRESS = '0x000000000000000000000000000000000000dEaD'; // Burn address for demo

// Initialize provider if RPC URL is available
let provider: JsonRpcProvider | null = null;
let abtContract: Contract | null = null;

if (SEPOLIA_RPC_URL && ABT_CONTRACT_ADDRESS) {
  try {
    provider = new JsonRpcProvider(SEPOLIA_RPC_URL);
    abtContract = new Contract(ABT_CONTRACT_ADDRESS, ERC20_ABI, provider);
    console.log('Blockchain service initialized for Sepolia');
  } catch (error: any) {
    console.error('Failed to initialize blockchain service:', error.message);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DepositVerification {
  verified: boolean;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  amountFormatted: string;
  blockNumber: number;
  timestamp: number;
  error?: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  contractAddress: string;
}

// ─── Public Functions ─────────────────────────────────────────────────────────

/**
 * Check if blockchain verification is available
 */
export function isBlockchainEnabled(): boolean {
  return provider !== null && abtContract !== null;
}

/**
 * Get ABT token info
 */
export async function getTokenInfo(): Promise<TokenInfo | null> {
  if (!abtContract) return null;

  try {
    const [name, symbol, decimals] = await Promise.all([
      abtContract.name(),
      abtContract.symbol(),
      abtContract.decimals(),
    ]);

    return {
      name,
      symbol,
      decimals,
      contractAddress: ABT_CONTRACT_ADDRESS!,
    };
  } catch (error: any) {
    console.error('Failed to get token info:', error.message);
    return null;
  }
}

/**
 * Verify a deposit transaction
 * 
 * Checks that:
 * 1. The transaction exists and is confirmed
 * 2. It's a Transfer event to the treasury address
 * 3. The amount is >= required deposit
 * 4. The sender matches the expected address
 */
export async function verifyDepositTransaction(
  txHash: string,
  expectedFrom: string
): Promise<DepositVerification> {
  // Mock verification if blockchain is not enabled
  if (!isBlockchainEnabled()) {
    return mockVerifyDeposit(txHash, expectedFrom);
  }

  try {
    // Get transaction receipt
    const receipt = await provider!.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return {
        verified: false,
        txHash,
        from: '',
        to: '',
        amount: '0',
        amountFormatted: '0',
        blockNumber: 0,
        timestamp: 0,
        error: 'Transaction not found or not yet confirmed',
      };
    }

    // Parse Transfer events from the receipt
    const transferEvents = receipt.logs
      .filter(log => log.address.toLowerCase() === ABT_CONTRACT_ADDRESS!.toLowerCase())
      .map(log => {
        try {
          return abtContract!.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
        } catch {
          return null;
        }
      })
      .filter(event => event !== null && event.name === 'Transfer');

    if (transferEvents.length === 0) {
      return {
        verified: false,
        txHash,
        from: '',
        to: '',
        amount: '0',
        amountFormatted: '0',
        blockNumber: receipt.blockNumber,
        timestamp: 0,
        error: 'No ABT Transfer events found in transaction',
      };
    }

    // Find a Transfer event that matches our criteria
    for (const event of transferEvents) {
      const from = event!.args[0] as string;
      const to = event!.args[1] as string;
      const value = event!.args[2] as bigint;

      // Check if this is a deposit to treasury from the expected sender
      if (
        from.toLowerCase() === expectedFrom.toLowerCase() &&
        to.toLowerCase() === TREASURY_ADDRESS.toLowerCase() &&
        value >= REQUIRED_DEPOSIT
      ) {
        // Get block timestamp
        const block = await provider!.getBlock(receipt.blockNumber);
        const timestamp = block?.timestamp || 0;

        return {
          verified: true,
          txHash,
          from,
          to,
          amount: value.toString(),
          amountFormatted: ethers.formatEther(value) + ' ABT',
          blockNumber: receipt.blockNumber,
          timestamp,
        };
      }
    }

    // No matching transfer found
    return {
      verified: false,
      txHash,
      from: transferEvents[0]!.args[0] as string,
      to: transferEvents[0]!.args[1] as string,
      amount: (transferEvents[0]!.args[2] as bigint).toString(),
      amountFormatted: ethers.formatEther(transferEvents[0]!.args[2] as bigint) + ' ABT',
      blockNumber: receipt.blockNumber,
      timestamp: 0,
      error: `Transfer does not meet requirements: must be ${ethers.formatEther(REQUIRED_DEPOSIT)} ABT to treasury`,
    };
  } catch (error: any) {
    return {
      verified: false,
      txHash,
      from: '',
      to: '',
      amount: '0',
      amountFormatted: '0',
      blockNumber: 0,
      timestamp: 0,
      error: `Verification failed: ${error.message}`,
    };
  }
}

/**
 * Get ABT balance for an address
 */
export async function getABTBalance(address: string): Promise<string> {
  if (!abtContract) return '0';

  try {
    const balance = await abtContract.balanceOf(address);
    return ethers.formatEther(balance);
  } catch (error: any) {
    console.error('Failed to get balance:', error.message);
    return '0';
  }
}

/**
 * Get required deposit amount (formatted)
 */
export function getRequiredDeposit(): string {
  return ethers.formatEther(REQUIRED_DEPOSIT) + ' ABT';
}

/**
 * Get required deposit amount (raw)
 */
export function getRequiredDepositRaw(): bigint {
  return REQUIRED_DEPOSIT;
}

/**
 * Get treasury address
 */
export function getTreasuryAddress(): string {
  return TREASURY_ADDRESS;
}

// ─── Mock Functions ───────────────────────────────────────────────────────────

/**
 * Mock deposit verification for demo/testing
 */
function mockVerifyDeposit(txHash: string, expectedFrom: string): DepositVerification {
  // Simple validation: tx hash should be 66 characters (0x + 64 hex)
  const isValidFormat = /^0x[a-fA-F0-9]{64}$/.test(txHash);
  
  if (!isValidFormat) {
    return {
      verified: false,
      txHash,
      from: '',
      to: '',
      amount: '0',
      amountFormatted: '0',
      blockNumber: 0,
      timestamp: 0,
      error: 'Invalid transaction hash format',
    };
  }

  // Mock: accept any validly-formatted tx hash in demo mode
  console.log(`[Mock Blockchain] Accepting deposit from ${expectedFrom} with tx ${txHash}`);
  
  return {
    verified: true,
    txHash,
    from: expectedFrom,
    to: TREASURY_ADDRESS,
    amount: REQUIRED_DEPOSIT.toString(),
    amountFormatted: ethers.formatEther(REQUIRED_DEPOSIT) + ' ABT',
    blockNumber: 12345678,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Generate a mock transaction hash for testing
 */
export function generateMockTxHash(): string {
  const randomBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    randomBytes[i] = Math.floor(Math.random() * 256);
  }
  return '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
