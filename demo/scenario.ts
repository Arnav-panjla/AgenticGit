/**
 * AgentBranch Demo Scenario
 *
 * Demonstrates a full collaborative agent workflow:
 *   research-agent.eth  → commits bridge architecture analysis
 *   coding-agent.eth    → creates branch, implements solution
 *   audit-agent.eth     → reviews, commits fix, merges PR
 *
 * Run against a live backend: npm run demo
 */

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const BASE_URL = process.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function post(path: string, body: object): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function get(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function log(section: string, data: object) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${section}`);
  console.log('─'.repeat(60));
  console.log(JSON.stringify(data, null, 2));
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

async function runDemo() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         AgentBranch — Demo Scenario                     ║');
  console.log('║  Collaborative Smart Contract Design by AI Agents        ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ── Step 1: Register agents ───────────────────────────────────────────────
  console.log('Step 1: Registering agents...');

  const researcher = await post('/agents', {
    ens_name: 'research-agent.eth',
    role: 'researcher',
    capabilities: ['analysis', 'documentation', 'literature-review'],
  });
  log('research-agent.eth registered', researcher);

  const coder = await post('/agents', {
    ens_name: 'coding-agent.eth',
    role: 'engineer',
    capabilities: ['solidity', 'typescript', 'testing'],
  });
  log('coding-agent.eth registered', coder);

  const auditor = await post('/agents', {
    ens_name: 'audit-agent.eth',
    role: 'auditor',
    capabilities: ['security-review', 'formal-verification', 'gas-optimization'],
  });
  log('audit-agent.eth registered', auditor);

  // ── Step 2: Create repository ─────────────────────────────────────────────
  console.log('\nStep 2: Creating repository...');

  const repo = await post('/repositories', {
    name: 'smart-contract-bridge',
    owner_ens: 'research-agent.eth',
    description: 'Collaborative design of a cross-chain bridge smart contract',
    initial_permission: 'team',
  });
  log('Repository created', repo);

  // ── Step 3: Deposit bounty ────────────────────────────────────────────────
  console.log('\nStep 3: Depositing bounty into repo treasury...');

  const deposit = await post(`/repositories/${repo.id}/deposit`, {
    agent_ens: 'research-agent.eth',
    amount: 500,
    note: 'Initial bounty pool for bridge implementation',
  });
  log('Bounty deposited', deposit);

  // ── Step 4: Research agent commits analysis to main ───────────────────────
  console.log('\nStep 4: Research agent commits bridge analysis to main...');

  const researchCommit = await post(`/repositories/${repo.id}/commits`, {
    branch: 'main',
    content: `# Bridge Architecture Analysis

## Overview
Cross-chain bridge connecting Ethereum L1 to an L2 rollup.

## Key Components
1. Lock/Unlock mechanism on L1
2. Message passing via optimistic challenge period
3. Relayer network for event monitoring

## Security Considerations
- Re-entrancy protection required on withdraw()
- Ensure msg.sender validation on all privileged calls
- Rate limiting on large withdrawals

## Recommended Approach
Use a 2-of-3 multisig for guardian controls.
Implement EIP-2612 permit for gas-free approvals.`,
    message: 'Add bridge architecture analysis and security recommendations',
    author_ens: 'research-agent.eth',
    content_type: 'text',
  });
  log('Research commit created', researchCommit);

  // ── Step 5: Coding agent creates implementation branch ────────────────────
  console.log('\nStep 5: Coding agent creates implementation branch...');

  const implBranch = await post(`/repositories/${repo.id}/branches`, {
    name: 'implementation-v1',
    base_branch: 'main',
    creator_ens: 'coding-agent.eth',
  });
  log('Branch created', implBranch);

  // ── Step 6: Coding agent commits implementation ───────────────────────────
  console.log('\nStep 6: Coding agent commits initial implementation...');

  const codeCommit = await post(`/repositories/${repo.id}/commits`, {
    branch: 'implementation-v1',
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Bridge {
    mapping(address => uint256) public locked;
    address public guardian;

    event Locked(address indexed user, uint256 amount);
    event Unlocked(address indexed user, uint256 amount);

    constructor(address _guardian) {
        guardian = _guardian;
    }

    function lock() external payable {
        locked[msg.sender] += msg.value;
        emit Locked(msg.sender, msg.value);
    }

    function unlock(address user, uint256 amount) external {
        require(msg.sender == guardian, "Not guardian");
        require(locked[user] >= amount, "Insufficient locked");
        locked[user] -= amount;
        // BUG: missing re-entrancy guard!
        (bool ok,) = user.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Unlocked(user, amount);
    }
}`,
    message: 'Initial bridge contract implementation (v1)',
    author_ens: 'coding-agent.eth',
    content_type: 'file',
  });
  log('Implementation commit created', codeCommit);

  // ── Step 7: Open pull request ─────────────────────────────────────────────
  console.log('\nStep 7: Opening pull request...');

  const pr = await post(`/repositories/${repo.id}/pulls`, {
    source_branch: 'implementation-v1',
    target_branch: 'main',
    description: 'Initial bridge contract implementation ready for audit review',
    author_ens: 'coding-agent.eth',
    bounty_amount: 200,
  });
  log('Pull request opened', pr);

  // ── Step 8: Audit agent commits fix ──────────────────────────────────────
  console.log('\nStep 8: Audit agent reviews and commits reentrancy fix...');

  const fixCommit = await post(`/repositories/${repo.id}/commits`, {
    branch: 'implementation-v1',
    content: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Bridge is ReentrancyGuard {
    mapping(address => uint256) public locked;
    address public guardian;

    event Locked(address indexed user, uint256 amount);
    event Unlocked(address indexed user, uint256 amount);

    constructor(address _guardian) {
        guardian = _guardian;
    }

    function lock() external payable {
        locked[msg.sender] += msg.value;
        emit Locked(msg.sender, msg.value);
    }

    // FIX: Added nonReentrant modifier + CEI pattern (Checks-Effects-Interactions)
    function unlock(address user, uint256 amount) external nonReentrant {
        require(msg.sender == guardian, "Not guardian");
        require(locked[user] >= amount, "Insufficient locked");
        locked[user] -= amount;                          // Effect first
        (bool ok,) = user.call{value: amount}("");       // Interaction last
        require(ok, "Transfer failed");
        emit Unlocked(user, amount);
    }
}`,
    message: 'Fix reentrancy vulnerability — apply CEI pattern + ReentrancyGuard',
    author_ens: 'audit-agent.eth',
    content_type: 'file',
  });
  log('Audit fix committed', fixCommit);

  // ── Step 9: Merge PR ──────────────────────────────────────────────────────
  console.log('\nStep 9: Merging PR (audit agent approves)...');

  const merged = await post(`/repositories/${repo.id}/pulls/${pr.id}/merge`, {
    reviewer_ens: 'audit-agent.eth',
  });
  log('Pull request merged', merged);

  // ── Step 10: Final state ──────────────────────────────────────────────────
  console.log('\nStep 10: Final system state...');

  const repoState = await get(`/repositories/${repo.id}`);
  const commits = await get(`/repositories/${repo.id}/commits?agent_ens=research-agent.eth`);
  const prs = await get(`/repositories/${repo.id}/pulls`);
  const ledger = await get(`/repositories/${repo.id}/bounty`);
  const agents = await get('/agents');

  log('Repository final state', repoState);
  log(`All commits (${commits.length} total)`, commits.map((c: any) => ({
    message: c.message,
    author: c.author_ens,
    branch: c.branch_name,
    at: c.created_at,
  })));
  log(`Pull requests (${prs.length} total)`, prs.map((p: any) => ({
    description: p.description,
    status: p.status,
    author: p.author_ens,
    reviewer: p.reviewer_ens,
    bounty: p.bounty_amount,
  })));
  log('Bounty ledger', ledger.map((e: any) => ({
    type: e.tx_type,
    amount: e.amount,
    agent: e.ens_name,
    note: e.note,
  })));
  log('Agent leaderboard', agents.map((a: any) => ({
    ens: a.ens_name,
    role: a.role,
    reputation: a.reputation_score,
  })));

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  Demo complete! AgentBranch workflow demonstrated.       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
}

runDemo().catch((err) => {
  console.error('\nDemo failed:', err.message);
  process.exit(1);
});
