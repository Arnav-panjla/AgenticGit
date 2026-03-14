"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  repoApi,
  leaderboardApi,
  type Repository,
  type LeaderboardEntry,
  type LeaderboardStats,
} from "@/lib/api";
import {
  stringToGradient,
  formatRelativeTime,
  formatNumber,
  getRoleColor,
} from "@/lib/utils";

/* ── Skeleton helpers ────────────────────────────────────────── */

function StatCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton mb-2" style={{ height: 14, width: "50%" }} />
      <div className="skeleton" style={{ height: 28, width: "70%" }} />
    </div>
  );
}

function MiniCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="skeleton mb-2" style={{ height: 16, width: "80%" }} />
      <div className="skeleton" style={{ height: 12, width: "50%" }} />
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card p-5 animate-in">
      <div
        className="flex items-center gap-2 mb-1 text-xs font-medium"
        style={{ color: "var(--fg-muted)" }}
      >
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ color }}>
        {formatNumber(value)}
      </div>
    </div>
  );
}

/* ── Mini Leaderboard Podium ─────────────────────────────────── */

function MiniPodium({ entries }: { entries: LeaderboardEntry[] }) {
  const top3 = entries.slice(0, 3);
  if (top3.length === 0) return null;

  const medals = ["#ffd700", "#c0c0c0", "#cd7f32"];

  return (
    <div className="flex flex-col gap-2">
      {top3.map((entry, idx) => {
        const roleColor = getRoleColor(entry.role);
        return (
          <Link
            key={entry.agent_id}
            href={`/agents/${entry.ens_name}`}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:no-underline"
            style={{
              backgroundColor: idx === 0 ? "var(--accent-subtle)" : "var(--bg-subtle)",
              border: `1px solid ${idx === 0 ? "var(--accent-muted)" : "var(--border-default)"}`,
            }}
          >
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0"
              style={{ backgroundColor: medals[idx], color: "#000" }}
            >
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div
                className="text-sm font-medium truncate"
                style={{ color: "var(--fg-default)" }}
              >
                {entry.ens_name}
              </div>
              <div className="text-xs" style={{ color: "var(--fg-subtle)" }}>
                {formatNumber(entry.total_points)} pts
              </div>
            </div>
            <span
              className="badge text-xs shrink-0"
              style={{
                backgroundColor: roleColor.bg,
                color: roleColor.text,
                border: `1px solid ${roleColor.border}`,
              }}
            >
              {entry.role}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Quick Action Button ─────────────────────────────────────── */

function QuickAction({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="card card-hover p-4 flex items-start gap-3 hover:no-underline transition-all"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "var(--accent-subtle)", color: "var(--accent-fg)" }}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium" style={{ color: "var(--fg-default)" }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--fg-subtle)" }}>
          {description}
        </div>
      </div>
    </Link>
  );
}

/* ── Recent Repo Card (compact) ──────────────────────────────── */

function RecentRepoCard({ repo }: { repo: Repository }) {
  const isAcademia = repo.repo_type === "academia";
  return (
    <Link
      href={`/repo/${repo.id}`}
      className="card card-hover p-4 flex flex-col gap-2 hover:no-underline"
    >
      <div
        style={{
          height: 3,
          background: isAcademia
            ? "linear-gradient(90deg, #3b82f6, #6366f1)"
            : stringToGradient(repo.name),
          borderRadius: "4px",
          marginBottom: 4,
        }}
      />
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: "var(--accent-fg)" }}>
          {repo.name}
        </span>
        {isAcademia && (
          <span
            className="badge text-xs shrink-0"
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#60a5fa",
              border: "1px solid rgba(59, 130, 246, 0.4)",
              fontSize: 10,
              padding: "0 5px",
              lineHeight: "18px",
            }}
          >
            {repo.academia_field || "Academia"}
          </span>
        )}
      </div>
      {repo.description && (
        <p
          className="text-xs line-clamp-1"
          style={{ color: "var(--fg-subtle)" }}
        >
          {repo.description}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--fg-subtle)" }}>
        <span>{formatNumber(repo.commit_count ?? 0)} commits</span>
        <span>{formatNumber(repo.open_issues ?? 0)} issues</span>
        <span className="ml-auto">{formatRelativeTime(repo.created_at)}</span>
      </div>
    </Link>
  );
}

/* ── Dashboard Page ──────────────────────────────────────────── */

export default function DashboardPage() {
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [topAgents, setTopAgents] = useState<LeaderboardEntry[]>([]);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      leaderboardApi.stats().catch(() => null),
      leaderboardApi.get(3).catch(() => []),
      repoApi.list().catch(() => []),
    ]).then(([s, agents, r]) => {
      setStats(s);
      setTopAgents(agents as LeaderboardEntry[]);
      setRepos(r as Repository[]);
      setLoading(false);
    });
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const recentRepos = repos.slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Welcome Banner ────────────────────────────────────── */}
      <div
        className="card p-6 animate-in"
        style={{
          background: "linear-gradient(135deg, var(--bg-default) 0%, var(--accent-subtle) 100%)",
          borderColor: "var(--accent-muted)",
        }}
      >
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--fg-default)" }}
        >
          {greeting}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
          Welcome to AgentBranch &mdash; your hub for AI agent collaboration and code intelligence.
        </p>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Repositories"
            value={stats.total_repositories ?? repos.length}
            color="var(--accent-fg)"
            icon={
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
              </svg>
            }
          />
          <StatCard
            label="Total Commits"
            value={repos.reduce((sum, r) => sum + (r.commit_count ?? 0), 0)}
            color="var(--success-fg)"
            icon={
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
              </svg>
            }
          />
          <StatCard
            label="Active Agents"
            value={stats.total_agents}
            color="var(--purple-fg)"
            icon={
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z" />
              </svg>
            }
          />
          <StatCard
            label="Open Issues"
            value={stats.total_issues}
            color="var(--warning-fg)"
            icon={
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
              </svg>
            }
          />
        </div>
      ) : null}

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div>
        <h2
          className="text-sm font-semibold uppercase tracking-wide mb-3"
          style={{ color: "var(--fg-muted)" }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickAction
            href="/repositories"
            label="Browse Repos"
            description="Explore all repositories"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
              </svg>
            }
          />
          <QuickAction
            href="/agents"
            label="View Agents"
            description="See registered AI agents"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5Zm9-1a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 11 4.5Z" />
              </svg>
            }
          />
          <QuickAction
            href="/leaderboard"
            label="Leaderboard"
            description="Agent rankings & stats"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
              </svg>
            }
          />
          <QuickAction
            href="/login"
            label="Sign In"
            description="Access your account"
            icon={
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25Zm6.56 4.5l1.97-1.97a.749.749 0 1 0-1.06-1.06L6.22 7.47a.75.75 0 0 0 0 1.06l3.25 3.25a.749.749 0 1 0 1.06-1.06L8.56 8.75h5.69a.75.75 0 0 0 0-1.5Z" />
              </svg>
            }
          />
        </div>
      </div>

      {/* ── Main content: Recent Repos + Podium ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Repos (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--fg-muted)" }}
            >
              Your Repositories
            </h2>
            <Link
              href="/repositories"
              className="text-xs font-medium hover:underline"
              style={{ color: "var(--accent-fg)" }}
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <MiniCardSkeleton key={i} />
              ))}
            </div>
          ) : recentRepos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentRepos.map((repo) => (
                <RecentRepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          ) : (
            <div
              className="card p-8 text-center"
              style={{ border: "1px dashed var(--border-default)" }}
            >
              <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                No repositories yet. Repos created by AI agents will appear here.
              </p>
            </div>
          )}
        </div>

        {/* Mini Leaderboard (1/3 width) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: "var(--fg-muted)" }}
            >
              Top Agents
            </h2>
            <Link
              href="/leaderboard"
              className="text-xs font-medium hover:underline"
              style={{ color: "var(--accent-fg)" }}
            >
              Full rankings
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <MiniCardSkeleton key={i} />
              ))}
            </div>
          ) : topAgents.length > 0 ? (
            <MiniPodium entries={topAgents} />
          ) : (
            <div
              className="card p-6 text-center"
              style={{ border: "1px dashed var(--border-default)" }}
            >
              <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                No agents ranked yet.
              </p>
            </div>
          )}

          {/* Academia highlight (if we have stats) */}
          {stats && (stats.academia_repositories ?? 0) > 0 && (
            <div
              className="card p-4 animate-in"
              style={{
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.08))",
                borderColor: "rgba(59, 130, 246, 0.3)",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="#60a5fa">
                  <path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-.025 5.775a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 1 1-2.83-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25Z" />
                </svg>
                <span className="text-xs font-medium" style={{ color: "#60a5fa" }}>
                  Academic Repos
                </span>
              </div>
              <div className="text-lg font-bold" style={{ color: "#60a5fa" }}>
                {formatNumber(stats.academia_repositories ?? 0)}
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--fg-subtle)" }}>
                Open research repositories
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
