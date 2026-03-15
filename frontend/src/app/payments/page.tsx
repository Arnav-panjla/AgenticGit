"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  blockchainApi,
  bitgoWalletApi,
  x402Api,
  agentApi,
  type BlockchainConfig,
  type X402Config,
  type X402PaymentRecord,
  type X402PaymentStats,
  type BitGoWalletListItem,
  type Agent,
} from "@/lib/api";
import { truncateAddress, formatRelativeTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

/* ── Skeleton Helpers ────────────────────────────────────────── */

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card p-5">
      <div className="skeleton mb-3" style={{ height: 16, width: "40%" }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton mb-2"
          style={{ height: 14, width: `${70 - i * 10}%` }}
        />
      ))}
    </div>
  );
}

/* ── Status Pill ─────────────────────────────────────────────── */

function StatusPill({
  active,
  label,
}: {
  active: boolean;
  label: string;
}) {
  return (
    <span
      className="badge text-xs"
      style={{
        backgroundColor: active
          ? "var(--success-subtle)"
          : "var(--danger-subtle)",
        color: active ? "var(--success-fg)" : "var(--danger-fg)",
        border: `1px solid ${active ? "var(--success-muted)" : "var(--danger-muted)"}`,
      }}
    >
      {label}
    </span>
  );
}

/* ── Config Row ──────────────────────────────────────────────── */

function ConfigRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border-muted)" }}>
      <span className="text-xs font-medium" style={{ color: "var(--fg-muted)" }}>
        {label}
      </span>
      <span
        className={`text-xs ${mono ? "font-mono" : ""}`}
        style={{ color: "var(--fg-default)" }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── Stat Box ────────────────────────────────────────────────── */

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="card p-4 text-center animate-in">
      <div className="text-2xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
        {label}
      </div>
    </div>
  );
}

/* ── Payment Record Row ──────────────────────────────────────── */

function PaymentRow({ record }: { record: X402PaymentRecord }) {
  const statusStyle =
    record.status === "settled"
      ? { bg: "var(--success-subtle)", text: "var(--success-fg)", border: "var(--success-muted)" }
      : record.status === "verified"
        ? { bg: "var(--warning-subtle)", text: "var(--warning-fg)", border: "var(--warning-muted)" }
        : { bg: "var(--danger-subtle)", text: "var(--danger-fg)", border: "var(--danger-muted)" };

  return (
    <div
      className="flex items-center gap-3 py-3 border-b table-row-hover px-2 rounded"
      style={{ borderColor: "var(--border-muted)" }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-mono truncate" style={{ color: "var(--fg-default)" }}>
          {record.route}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--fg-subtle)" }}>
          From: {truncateAddress(record.payerAddress)}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-semibold" style={{ color: "var(--accent-fg)" }}>
          {record.amount}
        </div>
        <div className="text-xs" style={{ color: "var(--fg-subtle)" }}>
          {formatRelativeTime(record.settledAt)}
        </div>
      </div>
      <span
        className="badge text-xs shrink-0"
        style={{
          backgroundColor: statusStyle.bg,
          color: statusStyle.text,
          border: `1px solid ${statusStyle.border}`,
        }}
      >
        {record.status}
      </span>
    </div>
  );
}

/* ── Protected Route Card ────────────────────────────────────── */

function ProtectedRouteCard({
  route,
  price,
  description,
}: {
  route: string;
  price: string;
  description: string;
}) {
  const [method, path] = route.split(" ", 2);
  const methodColor =
    method === "POST"
      ? "var(--success-fg)"
      : method === "GET"
        ? "var(--accent-fg)"
        : method === "DELETE"
          ? "var(--danger-fg)"
          : "var(--warning-fg)";

  return (
    <div
      className="p-3 rounded-lg border"
      style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-default)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
          style={{ color: methodColor, backgroundColor: "var(--bg-inset)" }}
        >
          {method}
        </span>
        <span className="text-xs font-mono truncate" style={{ color: "var(--fg-default)" }}>
          {path}
        </span>
        <span
          className="ml-auto text-xs font-semibold shrink-0"
          style={{ color: "var(--warning-fg)" }}
        >
          {price}
        </span>
      </div>
      <div className="text-xs" style={{ color: "var(--fg-subtle)" }}>
        {description}
      </div>
    </div>
  );
}

/* ── Wallet Card ─────────────────────────────────────────────── */

function WalletCard({ wallet }: { wallet: BitGoWalletListItem }) {
  return (
    <div
      className="card p-4 animate-in"
      style={{
        background: "linear-gradient(135deg, var(--bg-default) 0%, var(--accent-subtle) 100%)",
        borderColor: "var(--accent-muted)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "var(--accent-subtle)", color: "var(--accent-fg)" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--fg-default)" }}>
            {wallet.label}
          </div>
          <div className="text-xs font-mono" style={{ color: "var(--fg-subtle)" }}>
            {truncateAddress(wallet.address)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--fg-muted)" }}>
        <span>ID: {truncateAddress(wallet.walletId, 4)}</span>
        <span className="ml-auto">Balance: {wallet.balance}</span>
      </div>
    </div>
  );
}

/* ── Send Transaction Form ───────────────────────────────────── */

function SendTransactionForm({ agents }: { agents: Agent[] }) {
  const [agentId, setAgentId] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    setError(null);

    try {
      const res = await bitgoWalletApi.send(agentId, toAddress, amount, note || undefined);
      setResult(`Transaction sent! Hash: ${res.transaction.txHash}`);
      setAmount("");
      setNote("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label-text block mb-1">Agent</label>
        <select
          className="input"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          required
        >
          <option value="">Select agent...</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.ens_name} ({a.role})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-text block mb-1">Recipient Address</label>
        <input
          className="input"
          type="text"
          placeholder="0x..."
          value={toAddress}
          onChange={(e) => setToAddress(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label-text block mb-1">Amount (wei)</label>
        <input
          className="input"
          type="text"
          placeholder="1000000000000000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label-text block mb-1">Note (optional)</label>
        <input
          className="input"
          type="text"
          placeholder="Payment for bounty #12"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={sending || !agentId || !toAddress || !amount}
      >
        {sending ? "Sending..." : "Send Transaction"}
      </button>
      {result && (
        <div
          className="p-3 rounded-lg text-xs font-mono"
          style={{ backgroundColor: "var(--success-subtle)", color: "var(--success-fg)", border: "1px solid var(--success-muted)" }}
        >
          {result}
        </div>
      )}
      {error && (
        <div
          className="p-3 rounded-lg text-xs"
          style={{ backgroundColor: "var(--danger-subtle)", color: "var(--danger-fg)", border: "1px solid var(--danger-muted)" }}
        >
          {error}
        </div>
      )}
    </form>
  );
}

/* ── Create Wallet Form ──────────────────────────────────────── */

function CreateWalletForm({
  agents,
  onCreated,
}: {
  agents: Agent[];
  onCreated: () => void;
}) {
  const [agentId, setAgentId] = useState("");
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await bitgoWalletApi.create(agentId, label);
      setAgentId("");
      setLabel("");
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create wallet");
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="label-text block mb-1">Agent</label>
        <select
          className="input"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          required
        >
          <option value="">Select agent...</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.ens_name} ({a.role})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-text block mb-1">Wallet Label</label>
        <input
          className="input"
          type="text"
          placeholder="e.g. bounty-payments"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={creating || !agentId || !label}
      >
        {creating ? "Creating..." : "Create Wallet"}
      </button>
      {error && (
        <div
          className="p-3 rounded-lg text-xs"
          style={{ backgroundColor: "var(--danger-subtle)", color: "var(--danger-fg)", border: "1px solid var(--danger-muted)" }}
        >
          {error}
        </div>
      )}
    </form>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */

export default function PaymentsPage() {
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [blockchainConfig, setBlockchainConfig] = useState<BlockchainConfig | null>(null);
  const [x402Config, setX402Config] = useState<X402Config | null>(null);
  const [x402Stats, setX402Stats] = useState<X402PaymentStats | null>(null);
  const [payments, setPayments] = useState<X402PaymentRecord[]>([]);
  const [wallets, setWallets] = useState<BitGoWalletListItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "wallets" | "x402" | "send">("overview");

  const fetchData = () => {
    Promise.all([
      blockchainApi.config().catch(() => null),
      x402Api.config().catch(() => null),
      x402Api.stats().catch(() => null),
      x402Api.payments().catch(() => null),
      bitgoWalletApi.list().catch(() => null),
      agentApi.list().catch(() => []),
    ]).then(([bc, x4, stats, pay, wl, ag]) => {
      setBlockchainConfig(bc as BlockchainConfig | null);
      setX402Config(x4 as X402Config | null);
      setX402Stats(stats as X402PaymentStats | null);
      if (pay) setPayments((pay as { total: number; payments: X402PaymentRecord[] }).payments);
      if (wl) setWallets((wl as { bitgo_enabled: boolean; wallets: BitGoWalletListItem[] }).wallets);
      setAgents(ag as Agent[]);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    { key: "overview" as const, label: "Overview" },
    { key: "x402" as const, label: "x402 Protocol" },
    { key: "wallets" as const, label: "BitGo Wallets" },
    { key: "send" as const, label: "Send TX" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="skeleton" style={{ height: 32, width: "30%" }} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton lines={5} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header Banner ─────────────────────────────────────── */}
      <div
        className="card p-6 animate-in"
        style={{
          background: "linear-gradient(135deg, var(--bg-default) 0%, rgba(139, 92, 246, 0.08) 50%, rgba(251, 191, 36, 0.06) 100%)",
          borderColor: "var(--accent-muted)",
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "var(--accent-subtle)", color: "var(--accent-fg)" }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm.25-11.25v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 1.5 0Zm0 4v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 1.5 0Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--fg-default)" }}>
              Payments & Wallets
            </h1>
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
              v7 payment infrastructure: x402 micropayments, BitGo wallets, Base Sepolia
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <StatusPill active={!!blockchainConfig?.blockchainEnabled} label={blockchainConfig?.blockchainEnabled ? "Blockchain Active" : "Blockchain Off"} />
          <StatusPill active={!!x402Config?.enabled} label={x402Config?.enabled ? "x402 Active" : "x402 Off"} />
          <StatusPill active={!!blockchainConfig?.bitgo?.enabled} label={blockchainConfig?.bitgo?.enabled ? "BitGo Active" : "BitGo Mock"} />
        </div>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? "tab-active" : "tab-inactive"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────── */}

      {activeTab === "overview" && (
        <div className="flex flex-col gap-6 animate-in">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox
              label="Total Payments"
              value={x402Stats?.totalPayments ?? 0}
              color="var(--accent-fg)"
            />
            <StatBox
              label="Settled"
              value={x402Stats?.settled ?? 0}
              color="var(--success-fg)"
            />
            <StatBox
              label="Failed"
              value={x402Stats?.failed ?? 0}
              color="var(--danger-fg)"
            />
            <StatBox
              label="Agent Wallets"
              value={wallets.length}
              color="var(--purple-fg)"
            />
          </div>

          {/* Two-column: Blockchain Config + Contracts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Blockchain Config */}
            <div className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wide mb-3"
                style={{ color: "var(--fg-muted)" }}
              >
                Blockchain Configuration
              </h2>
              {blockchainConfig ? (
                <div>
                  <ConfigRow label="Network" value={blockchainConfig.chain} />
                  <ConfigRow label="Chain ID" value={String(blockchainConfig.chainId)} />
                  <ConfigRow label="RPC URL" value={truncateAddress(blockchainConfig.rpcUrl, 20)} />
                  <ConfigRow label="Required Deposit" value={blockchainConfig.requiredDeposit} />
                  <ConfigRow label="Treasury" value={truncateAddress(blockchainConfig.treasury)} mono />
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                  Blockchain config unavailable
                </p>
              )}
            </div>

            {/* Smart Contracts */}
            <div className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wide mb-3"
                style={{ color: "var(--fg-muted)" }}
              >
                Deployed Contracts
              </h2>
              {blockchainConfig?.abtContract || blockchainConfig?.bountyContract ? (
                <div>
                  <div className="mb-3">
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--fg-muted)" }}>
                      ABT Token
                    </div>
                    <div
                      className="text-xs font-mono p-2 rounded"
                      style={{ backgroundColor: "var(--bg-inset)", color: "var(--accent-fg)" }}
                    >
                      {blockchainConfig.abtContract ?? "Not deployed"}
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--fg-muted)" }}>
                      BountyPayment
                    </div>
                    <div
                      className="text-xs font-mono p-2 rounded"
                      style={{ backgroundColor: "var(--bg-inset)", color: "var(--accent-fg)" }}
                    >
                      {blockchainConfig.bountyContract ?? "Not deployed"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusPill
                      active={!!blockchainConfig.blockchainEnabled}
                      label={blockchainConfig.blockchainEnabled ? "Blockchain Active" : "Blockchain Off"}
                    />
                    <StatusPill
                      active={!!blockchainConfig.bountyContractEnabled}
                      label={blockchainConfig.bountyContractEnabled ? "Bounty Active" : "Bounty Off"}
                    />
                  </div>
                  {blockchainConfig.token && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border-muted)" }}>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-purple text-xs">
                          {blockchainConfig.token.symbol}
                        </span>
                        <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                          {blockchainConfig.token.name} ({blockchainConfig.token.decimals} decimals)
                        </span>
                      </div>
                    </div>
                  )}
                  <a
                    href={`https://sepolia.basescan.org`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs mt-3 hover:underline"
                    style={{ color: "var(--accent-fg)" }}
                  >
                    View on Base Sepolia Explorer
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3.75 2h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 12.25 14h-8.5A1.75 1.75 0 0 1 2 12.25v-8.5C2 2.784 2.784 2 3.75 2Zm6.854-1h4.146a.25.25 0 0 1 .25.25v4.146a.25.25 0 0 1-.427.177L13.03 4.03 9.28 7.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.75-3.75-1.543-1.543A.25.25 0 0 1 10.604 1Z" />
                    </svg>
                  </a>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                  Contract data unavailable
                </p>
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--fg-muted)" }}
              >
                Recent Payments
              </h2>
              <button
                onClick={() => setActiveTab("x402")}
                className="text-xs font-medium hover:underline"
                style={{ color: "var(--accent-fg)" }}
              >
                View all
              </button>
            </div>
            {payments.length > 0 ? (
              <div>
                {payments.slice(0, 5).map((p) => (
                  <PaymentRow key={p.id} record={p} />
                ))}
              </div>
            ) : (
              <div
                className="p-6 text-center rounded-lg"
                style={{ border: "1px dashed var(--border-default)" }}
              >
                <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                  No payments recorded yet. Payments appear here when agents use x402-protected endpoints.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "x402" && (
        <div className="flex flex-col gap-6 animate-in">
          {/* x402 Config */}
          <div className="card p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--fg-muted)" }}
            >
              x402 Protocol Configuration
            </h2>
            {x402Config ? (
              <div>
                <ConfigRow label="Status" value={x402Config.enabled ? "Enabled" : "Disabled"} />
                <ConfigRow label="Facilitator" value={x402Config.facilitator} />
                <ConfigRow label="Network" value={x402Config.network} />
                <ConfigRow label="Treasury" value={truncateAddress(x402Config.treasury)} mono />
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                x402 config unavailable
              </p>
            )}
          </div>

          {/* Protected Routes */}
          <div className="card p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--fg-muted)" }}
            >
              Payment-Gated Routes
            </h2>
            <p className="text-xs mb-4" style={{ color: "var(--fg-subtle)" }}>
              These API endpoints require x402 micropayment via the PAYMENT-SIGNATURE header.
              Agents automatically handle payment negotiation using @x402/fetch.
            </p>
            {x402Config?.protectedRoutes && x402Config.protectedRoutes.length > 0 ? (
              <div className="space-y-2">
                {x402Config.protectedRoutes.map((r, i) => (
                  <ProtectedRouteCard
                    key={i}
                    route={r.route}
                    price={r.price}
                    description={r.description}
                  />
                ))}
              </div>
            ) : (
              <div
                className="p-4 text-center rounded-lg"
                style={{ border: "1px dashed var(--border-default)" }}
              >
                <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                  No payment-gated routes configured
                </p>
              </div>
            )}
          </div>

          {/* Payment Stats */}
          {x402Stats && (
            <div className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wide mb-3"
                style={{ color: "var(--fg-muted)" }}
              >
                Payment Statistics
              </h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatBox label="Total" value={x402Stats.totalPayments} color="var(--accent-fg)" />
                <StatBox label="Settled" value={x402Stats.settled} color="var(--success-fg)" />
                <StatBox label="Failed" value={x402Stats.failed} color="var(--danger-fg)" />
              </div>
              {Object.keys(x402Stats.byRoute).length > 0 && (
                <div>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    By Route
                  </h3>
                  {Object.entries(x402Stats.byRoute).map(([route, count]) => (
                    <div
                      key={route}
                      className="flex items-center justify-between py-1.5 border-b"
                      style={{ borderColor: "var(--border-muted)" }}
                    >
                      <span className="text-xs font-mono" style={{ color: "var(--fg-muted)" }}>
                        {route}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: "var(--accent-fg)" }}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Full Payment Log */}
          <div className="card p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--fg-muted)" }}
            >
              Payment Log
            </h2>
            {payments.length > 0 ? (
              <div>
                {payments.map((p) => (
                  <PaymentRow key={p.id} record={p} />
                ))}
              </div>
            ) : (
              <div
                className="p-6 text-center rounded-lg"
                style={{ border: "1px dashed var(--border-default)" }}
              >
                <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                  No payments recorded yet
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "wallets" && (
        <div className="flex flex-col gap-6 animate-in">
          {/* BitGo Status */}
          <div className="card p-5">
            <h2
              className="text-sm font-semibold uppercase tracking-wide mb-3"
              style={{ color: "var(--fg-muted)" }}
            >
              BitGo Wallet Management
            </h2>
            {blockchainConfig?.bitgo ? (
              <div>
                <ConfigRow label="Status" value={blockchainConfig.bitgo.enabled ? "Connected" : "Mock Mode"} />
                <ConfigRow label="Environment" value={blockchainConfig.bitgo.env} />
                <ConfigRow label="Coin" value={blockchainConfig.bitgo.coin} />
                <ConfigRow label="API Base" value={blockchainConfig.bitgo.apiBase} />
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                BitGo config unavailable
              </p>
            )}
          </div>

          {/* Wallet List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--fg-muted)" }}
              >
                Agent Wallets ({wallets.length})
              </h2>
              <button
                onClick={fetchData}
                className="btn-secondary text-xs"
              >
                Refresh
              </button>
            </div>
            {wallets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {wallets.map((w) => (
                  <WalletCard key={w.walletId} wallet={w} />
                ))}
              </div>
            ) : (
              <div
                className="card p-8 text-center"
                style={{ border: "1px dashed var(--border-default)" }}
              >
                <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                  No wallets created yet. Use the form below to create an agent wallet.
                </p>
              </div>
            )}
          </div>

          {/* Create Wallet Form */}
          {isAuthenticated && (
            <div className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wide mb-3"
                style={{ color: "var(--fg-muted)" }}
              >
                Create New Wallet
              </h2>
              <CreateWalletForm agents={agents} onCreated={fetchData} />
            </div>
          )}

          {!isAuthenticated && (
            <div
              className="card p-5 text-center"
              style={{ border: "1px dashed var(--border-default)" }}
            >
              <p className="text-sm mb-2" style={{ color: "var(--fg-subtle)" }}>
                Sign in to create wallets and send transactions
              </p>
              <Link href="/login" className="btn-primary text-sm">
                Sign in
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === "send" && (
        <div className="flex flex-col gap-6 animate-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Send Transaction */}
            <div className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wide mb-3"
                style={{ color: "var(--fg-muted)" }}
              >
                Send Transaction
              </h2>
              <p className="text-xs mb-4" style={{ color: "var(--fg-subtle)" }}>
                Send a blockchain transaction from an agent&apos;s BitGo wallet to any address on Base Sepolia.
              </p>
              {isAuthenticated ? (
                <SendTransactionForm agents={agents} />
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm mb-2" style={{ color: "var(--fg-subtle)" }}>
                    Sign in to send transactions
                  </p>
                  <Link href="/login" className="btn-primary text-sm">
                    Sign in
                  </Link>
                </div>
              )}
            </div>

            {/* How it Works */}
            <div className="card p-5">
              <h2
                className="text-sm font-semibold uppercase tracking-wide mb-3"
                style={{ color: "var(--fg-muted)" }}
              >
                How Payment Works
              </h2>
              <div className="space-y-4">
                {[
                  {
                    step: "1",
                    title: "Agent requests resource",
                    desc: "An AI agent calls a payment-gated API endpoint (e.g. POST bounty).",
                  },
                  {
                    step: "2",
                    title: "Server returns 402",
                    desc: "If no PAYMENT-SIGNATURE header, server responds with 402 and payment requirements.",
                  },
                  {
                    step: "3",
                    title: "Agent signs payment",
                    desc: "Agent uses @x402/fetch to sign an EIP-712 payment payload with its wallet key.",
                  },
                  {
                    step: "4",
                    title: "Facilitator verifies",
                    desc: "The Coinbase facilitator at facilitator.x402.org verifies the signed payment.",
                  },
                  {
                    step: "5",
                    title: "Resource served & settled",
                    desc: "Server returns the resource. Payment is settled on-chain asynchronously.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0"
                      style={{
                        backgroundColor: "var(--accent-subtle)",
                        color: "var(--accent-fg)",
                        border: "1px solid var(--accent-muted)",
                      }}
                    >
                      {item.step}
                    </span>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--fg-default)" }}>
                        {item.title}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--fg-subtle)" }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Architecture Note */}
          <div
            className="card p-5"
            style={{
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(99, 102, 241, 0.06))",
              borderColor: "rgba(99, 102, 241, 0.3)",
            }}
          >
            <h2
              className="text-sm font-semibold mb-2"
              style={{ color: "var(--indigo-fg)" }}
            >
              Architecture: x402 + BitGo + Base Sepolia
            </h2>
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
              AgentBranch v7 uses a layered payment architecture: <strong style={{ color: "var(--fg-default)" }}>x402</strong> handles
              HTTP-level micropayments (agents pay per-API-call via EIP-712 signatures), <strong style={{ color: "var(--fg-default)" }}>BitGo</strong> provides
              institutional-grade wallet management (key custody, multi-sig support), and
              all transactions settle on <strong style={{ color: "var(--fg-default)" }}>Base Sepolia</strong> (Coinbase L2, chain 84532).
              Smart contracts (ABT token + BountyPayment) are deployed via Foundry.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
