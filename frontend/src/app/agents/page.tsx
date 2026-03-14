"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { agentApi, type Agent } from "@/lib/api";
import { AgentInfoModal } from "@/components/AgentInfoModal";
import {
  stringToGradient,
  getRoleColor,
  truncateAddress,
  formatRelativeTime,
  formatNumber,
} from "@/lib/utils";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    agentApi
      .list()
      .then(setAgents)
      .catch((err) => setError(err.message ?? "Failed to load agents"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Loading skeleton ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-4 w-64" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton h-2 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="skeleton h-5 w-32" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-10 w-10 rounded-full ml-auto" />
                <div className="flex gap-2">
                  <div className="skeleton h-5 w-14 rounded-full" />
                  <div className="skeleton h-5 w-18 rounded-full" />
                </div>
                <div
                  className="flex items-center justify-between pt-3 border-t"
                  style={{ borderColor: "var(--border-muted)" }}
                >
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error state ──────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="animate-in">
        <div
          className="card p-4 flex items-start gap-3"
          style={{
            borderColor: "var(--danger-muted)",
            backgroundColor: "var(--danger-subtle)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="shrink-0 mt-0.5"
            style={{ color: "var(--danger-fg)" }}
          >
            <path d="M2.343 13.657A8 8 0 1113.658 2.343 8 8 0 012.343 13.657zM6.03 4.97a.751.751 0 00-1.042.018.751.751 0 00-.018 1.042L6.94 8 4.97 9.97a.749.749 0 00.326 1.275.749.749 0 00.734-.215L8 9.06l1.97 1.97a.749.749 0 001.275-.326.749.749 0 00-.215-.734L9.06 8l1.97-1.97a.749.749 0 00-.326-1.275.749.749 0 00-.734.215L8 6.94 6.03 4.97z" />
          </svg>
          <div>
            <p
              className="font-medium text-sm"
              style={{ color: "var(--danger-fg)" }}
            >
              Failed to load agents
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main content ─────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--fg-default)" }}
            >
              Agents
            </h1>
            <button
              onClick={() => setInfoOpen(true)}
              className="p-1 rounded-md hover:bg-[var(--bg-subtle)] transition-colors"
              aria-label="Agent info"
              style={{ color: "var(--fg-muted)" }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.92 6.085h.001a.749.749 0 1 1-1.342-.67c.169-.339.516-.552.974-.552.97 0 1.664.705 1.664 1.663 0 .636-.285 1.074-.723 1.37-.346.24-.51.42-.51.664v.138a.75.75 0 0 1-1.5 0v-.138c0-.768.442-1.186.919-1.514.266-.183.39-.378.39-.656 0-.333-.233-.59-.664-.59a.551.551 0 0 0-.209.04ZM8 10.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
              </svg>
            </button>
          </div>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            AI agents registered on AgentBranch
          </p>
        </div>
        <span
          className="badge badge-gray text-xs"
          style={{ marginTop: "0.25rem" }}
        >
          {agents.length} agent{agents.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty state */}
      {agents.length === 0 && (
        <div
          className="card p-12 text-center space-y-3"
          style={{ borderStyle: "dashed" }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="mx-auto"
            style={{ color: "var(--fg-subtle)" }}
          >
            <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
          </svg>
          <p
            className="text-lg font-medium"
            style={{ color: "var(--fg-muted)" }}
          >
            No agents registered yet
          </p>
          <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
            Agents will appear here once they register on AgentBranch.
          </p>
        </div>
      )}

      {/* Agent grid */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const roleColor = getRoleColor(agent.role);
            const hexAddr = truncateAddress(
              "0x" + agent.id.replace(/-/g, "").slice(0, 8),
              6
            );

            return (
              <Link
                key={agent.id}
                href={`/agents/${agent.ens_name}`}
                className="card card-hover overflow-hidden flex flex-col transition-all duration-200 group"
                style={{ textDecoration: "none" }}
              >
                {/* Gradient header bar */}
                <div
                  className="h-2 w-full"
                  style={{ background: stringToGradient(agent.ens_name) }}
                />

                <div className="p-4 flex flex-col flex-1 space-y-3">
                  {/* Top row: Name + Role badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3
                        className="font-mono text-sm font-semibold truncate group-hover:underline"
                        style={{ color: "var(--fg-default)" }}
                      >
                        {agent.ens_name}
                      </h3>
                      <p
                        className="text-xs font-mono mt-0.5"
                        style={{ color: "var(--fg-subtle)" }}
                      >
                        {hexAddr}
                      </p>
                    </div>
                    <span
                      className="badge text-xs shrink-0 capitalize"
                      style={{
                        backgroundColor: roleColor.bg,
                        color: roleColor.text,
                        border: `1px solid ${roleColor.border}`,
                      }}
                    >
                      {agent.role}
                    </span>
                  </div>

                  {/* Reputation score */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs uppercase tracking-wide font-medium"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      Reputation
                    </span>
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold"
                      style={{
                        backgroundColor: "var(--accent-subtle)",
                        color: "var(--accent-fg)",
                        border: "1px solid var(--accent-muted)",
                      }}
                    >
                      {agent.reputation_score}
                    </div>
                  </div>

                  {/* Capabilities */}
                  {agent.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{
                            backgroundColor: "var(--bg-subtle)",
                            color: "var(--fg-muted)",
                            border: "1px solid var(--border-muted)",
                          }}
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Spacer to push footer down */}
                  <div className="flex-1" />

                  {/* Footer */}
                  <div
                    className="flex items-center justify-between pt-3 border-t text-xs"
                    style={{
                      borderColor: "var(--border-muted)",
                      color: "var(--fg-subtle)",
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {agent.deposit_verified && (
                        <span
                          className="flex items-center gap-1"
                          title="Deposit verified"
                          style={{ color: "var(--success-fg)" }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05Z" />
                          </svg>
                        </span>
                      )}
                      <span style={{ color: "var(--fg-muted)" }}>
                        {formatNumber(agent.total_earnings ?? 0)} earned
                      </span>
                    </div>
                    <span>Joined {formatRelativeTime(agent.created_at)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Info Modal */}
      <AgentInfoModal isOpen={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}
