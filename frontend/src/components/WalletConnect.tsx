/**
 * WalletConnect Component
 * 
 * MetaMask integration for ERC-20 deposits.
 */

import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { blockchainApi, type BlockchainConfig } from '../api';

interface Props {
  onDepositComplete?: (txHash: string) => void;
}

// Minimal ERC-20 ABI for deposit
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function depositForAgent(string ens_name) external',
  'function faucet() external',
];

export function WalletConnect({ onDepositComplete }: Props) {
  const [config, setConfig] = useState<BlockchainConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    blockchainApi.config()
      .then(setConfig)
      .catch(console.error);
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('MetaMask is not installed');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);

        // Get balance
        if (config?.tokenAddress) {
          const signer = await provider.getSigner();
          const token = new Contract(config.tokenAddress, ERC20_ABI, signer);
          const bal = await token.balanceOf(accounts[0]);
          setBalance(formatEther(bal));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const claimFaucet = async () => {
    if (!config || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(config.tokenAddress, ERC20_ABI, signer);
      
      const tx = await token.faucet();
      await tx.wait();

      // Refresh balance
      const bal = await token.balanceOf(address);
      setBalance(formatEther(bal));
    } catch (err: any) {
      setError(err.message || 'Failed to claim faucet');
    } finally {
      setIsLoading(false);
    }
  };

  const depositForAgent = async (ensName: string) => {
    if (!config || !address) return;

    setIsLoading(true);
    setError(null);

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(config.tokenAddress, ERC20_ABI, signer);
      
      const tx = await token.depositForAgent(ensName);
      const receipt = await tx.wait();

      setTxHash(receipt.hash);
      onDepositComplete?.(receipt.hash);

      // Refresh balance
      const bal = await token.balanceOf(address);
      setBalance(formatEther(bal));
    } catch (err: any) {
      setError(err.message || 'Failed to deposit');
    } finally {
      setIsLoading(false);
    }
  };

  const useMockTx = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await blockchainApi.mockTx();
      setTxHash(result.tx_hash);
      onDepositComplete?.(result.tx_hash);
    } catch (err: any) {
      setError(err.message || 'Failed to create mock tx');
    } finally {
      setIsLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-slate-700 rounded w-32" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.5 12c0 5.799-4.701 10.5-10.5 10.5S1.5 17.799 1.5 12 6.201 1.5 12 1.5 22.5 6.201 22.5 12z" />
        </svg>
        <h4 className="font-medium text-slate-200">Blockchain Deposit</h4>
      </div>

      <div className="space-y-3">
        <div className="text-sm">
          <p className="text-slate-400">Network: <span className="text-slate-200">{config.network}</span></p>
          <p className="text-slate-400">Required: <span className="text-sky-400">{config.depositAmount} ABT</span></p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-md p-2 text-red-400 text-sm">
            {error}
          </div>
        )}

        {txHash && (
          <div className="bg-green-500/10 border border-green-500/50 rounded-md p-2 text-green-400 text-sm">
            <p>Transaction submitted!</p>
            <a 
              href={`${config.explorerUrl}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-300"
            >
              View on Explorer
            </a>
          </div>
        )}

        {!isConnected ? (
          <div className="space-y-2">
            <button
              onClick={connectWallet}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-md
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Connecting...' : 'Connect MetaMask'}
            </button>
            <button
              onClick={useMockTx}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-md
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Use Mock Transaction (Dev)
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Address:</span>
              <span className="text-slate-200 font-mono text-xs">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Balance:</span>
              <span className="text-slate-200">{balance} ABT</span>
            </div>

            <button
              onClick={claimFaucet}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-md
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {isLoading ? 'Processing...' : 'Claim Testnet Faucet (100 ABT)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
