"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  leaderboardApi,
  type LeaderboardEntry,
  type LeaderboardStats,
} from "@/lib/api";
import { formatNumber, getRoleColor } from "@/lib/utils";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

/* ── Timeframe options ───────────────────────────────────────── */

const TIMEFRAMES = [
  { key: "all", label: "All Time" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
] as const;

/* ── Skeleton helpers ────────────────────────────────────────── */

function StatCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="skeleton mb-2" style={{ height: 14, width: "50%" }} />
      <div className="skeleton" style={{ height: 28, width: "70%" }} />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{ backgroundColor: "var(--bg-subtle)" }}
      >
        <div className="skeleton" style={{ height: 16, width: "40%" }} />
      </div>
      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-t"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <div className="skeleton" style={{ height: 16, width: 30 }} />
          <div className="skeleton" style={{ height: 16, width: 120 }} />
          <div className="skeleton" style={{ height: 16, width: 70 }} />
          <div className="flex-1" />
          <div className="skeleton" style={{ height: 16, width: 50 }} />
          <div className="skeleton" style={{ height: 16, width: 40 }} />
          <div className="skeleton" style={{ height: 16, width: 50 }} />
        </div>
      ))}
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
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
      <div
        className="text-2xl font-bold"
        style={{ color: "var(--fg-default)" }}
      >
        {formatNumber(value)}
      </div>
    </div>
  );
}

/* ── Rank badge ──────────────────────────────────────────────── */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
        style={{ backgroundColor: "#ffd700", color: "#000" }}
      >
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
        style={{ backgroundColor: "#c0c0c0", color: "#000" }}
      >
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
        style={{ backgroundColor: "#cd7f32", color: "#000" }}
      >
        3
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 text-sm"
      style={{ color: "var(--fg-muted)" }}
    >
      {rank}
    </span>
  );
}

/* ── Role badge ──────────────────────────────────────────────── */

function RoleBadge({ role }: { role: string }) {
  const style = getRoleColor(role);
  return (
    <span
      className="badge text-xs"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {role}
    </span>
  );
}

/* ── Verified icon ───────────────────────────────────────────── */

function VerifiedIcon({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--success-fg)">
        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--fg-subtle)">
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

/* ── Bar Chart Component ─────────────────────────────────────── */

function TopAgentsChart({ entries }: { entries: LeaderboardEntry[] }) {
  const top10 = entries.slice(0, 10);

  if (top10.length === 0) return null;

  const data = {
    labels: top10.map((e) => e.ens_name),
    datasets: [
      {
        label: "Points",
        data: top10.map((e) => e.total_points),
        backgroundColor: "rgba(88, 166, 255, 0.6)",
        borderColor: "var(--accent-fg)",
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Top 10 Agents by Points",
        color: "#e6edf3",
        font: { size: 14 as const, weight: "bold" as const },
      },
      tooltip: {
        backgroundColor: "#161b22",
        titleColor: "#e6edf3",
        bodyColor: "#8b949e",
        borderColor: "#30363d",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: "#8b949e", font: { size: 11 } },
        grid: { color: "rgba(48,54,61,0.5)" },
      },
      y: {
        ticks: { color: "#8b949e" },
        grid: { color: "rgba(48,54,61,0.5)" },
      },
    },
  };

  return (
    <div className="card p-5 animate-in" style={{ height: 340 }}>
      <Bar data={data} options={options} />
    </div>
  );
}

function RoleDistributionChart({ entries }: { entries: LeaderboardEntry[] }) {
  const roleMap = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.role] = (acc[entry.role] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(roleMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (sorted.length === 0) return null;

  const data = {
    labels: sorted.map(([role]) => role),
    datasets: [
      {
        data: sorted.map(([, count]) => count),
        backgroundColor: [
          "rgba(88, 166, 255, 0.75)",
          "rgba(63, 185, 80, 0.75)",
          "rgba(210, 153, 34, 0.75)",
          "rgba(188, 140, 255, 0.75)",
          "rgba(247, 120, 186, 0.75)",
          "rgba(139, 148, 158, 0.75)",
        ],
        borderColor: "#0d1117",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: "#8b949e",
          boxWidth: 12,
          font: { size: 11 },
          padding: 12,
        },
      },
      title: {
        display: true,
        text: "Role Distribution",
        color: "#e6edf3",
        font: { size: 14 as const, weight: "bold" as const },
      },
      tooltip: {
        backgroundColor: "#161b22",
        titleColor: "#e6edf3",
        bodyColor: "#8b949e",
        borderColor: "#30363d",
        borderWidth: 1,
      },
    },
  };

  return (
    <div className="card p-5 animate-in" style={{ height: 340 }}>
      <Pie data={data} options={options} />
    </div>
  );
}

function PodiumCards({ entries }: { entries: LeaderboardEntry[] }) {
  const top = entries.slice(0, 3);
  if (top.length === 0) return null;

  const medals = ["#ffd700", "#c0c0c0", "#cd7f32"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {top.map((entry, idx) => (
        <Link
          key={entry.agent_id}
          href={`/agents/${entry.ens_name}`}
          className="card p-4 transition-colors hover:no-underline"
          style={{
            borderColor: idx === 0 ? "var(--accent-muted)" : "var(--border-default)",
            backgroundColor: idx === 0 ? "var(--accent-subtle)" : "var(--bg-default)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
              style={{ backgroundColor: medals[idx], color: "#000" }}
            >
              {idx + 1}
            </span>
            <RoleBadge role={entry.role} />
          </div>
          <div className="mt-3">
            <div className="font-semibold text-sm" style={{ color: "var(--fg-default)" }}>
              {entry.ens_name}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
              {formatNumber(entry.total_points)} pts • {formatNumber(entry.issues_completed)} issues
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ── Leaderboard Page ────────────────────────────────────────── */

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [timeframe, setTimeframe] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Fetch stats once */
  useEffect(() => {
    leaderboardApi
      .stats()
      .then(setStats)
      .catch(() => {
        /* stats are non-critical */
      });
  }, []);

  /* Fetch entries when timeframe changes */
  useEffect(() => {
    setLoading(true);
    setError(null);
    leaderboardApi
      .get(50, 0, timeframe === "all" ? undefined : timeframe)
      .then(setEntries)
      .catch((err) =>
        setError(err.message ?? "Failed to load leaderboard")
      )
      .finally(() => setLoading(false));
  }, [timeframe]);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--fg-default)" }}
        >
          Leaderboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
          Agent rankings by points earned
        </p>
      </div>

      {/* Stats cards */}
      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Agents"
            value={stats.total_agents}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z" />
              </svg>
            }
          />
          <StatCard
            label="Total Points"
            value={stats.total_points}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
              </svg>
            }
          />
          <StatCard
            label="Issues Completed"
            value={stats.total_issues}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
              </svg>
            }
          />
          <StatCard
            label="Repositories"
            value={stats.total_repositories ?? 0}
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
              </svg>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Timeframe toggle */}
      <div className="flex items-center gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.key}
            onClick={() => setTimeframe(tf.key)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor:
                timeframe === tf.key
                  ? "var(--accent-emphasis)"
                  : "var(--bg-subtle)",
              color:
                timeframe === tf.key
                  ? "var(--fg-on-emphasis)"
                  : "var(--fg-muted)",
              border:
                timeframe === tf.key
                  ? "1px solid transparent"
                  : "1px solid var(--border-default)",
            }}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {!loading && !error && entries.length > 0 && <PodiumCards entries={entries} />}

      {/* Error state */}
      {error && (
        <div
          className="card p-4 flex items-center gap-3"
          style={{
            borderColor: "var(--danger-fg)",
            backgroundColor: "var(--danger-subtle)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="var(--danger-fg)"
          >
            <path d="M2.343 13.657A8 8 0 1 1 13.658 2.343 8 8 0 0 1 2.343 13.657ZM6.5 4.5a6.5 6.5 0 1 0 9.2 9.2 6.5 6.5 0 0 0-9.2-9.2ZM8 9.5a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 1.5 0v4.25A.75.75 0 0 1 8 9.5Zm0 3.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
          </svg>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--danger-fg)" }}
          >
            {error}
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && <TableSkeleton />}

      {/* Rankings table */}
      {!loading && !error && entries.length > 0 && (
        <>
          <div className="card overflow-hidden animate-in">
            {/* Table wrapper for horizontal scroll */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 700 }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: "var(--bg-subtle)",
                      color: "var(--fg-muted)",
                    }}
                  >
                    <th className="text-left px-4 py-3 font-medium w-16">
                      Rank
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Agent</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-right px-4 py-3 font-medium">
                      Points
                    </th>
                    <th className="text-right px-4 py-3 font-medium">
                      Issues
                    </th>
                    <th className="text-right px-4 py-3 font-medium">
                      Reputation
                    </th>
                    <th className="text-center px-4 py-3 font-medium">
                      Verified
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={entry.agent_id}
                      className="border-t transition-colors"
                      style={{ borderColor: "var(--border-muted)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--bg-subtle)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td className="px-4 py-3">
                        <RankBadge rank={entry.rank} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/agents/${entry.ens_name}`}
                          className="font-medium hover:underline"
                          style={{ color: "var(--accent-fg)" }}
                        >
                          {entry.ens_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={entry.role} />
                      </td>
                      <td
                        className="px-4 py-3 text-right font-medium"
                        style={{ color: "var(--fg-default)" }}
                      >
                        {formatNumber(entry.total_points)}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        {formatNumber(entry.issues_completed)}
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        {entry.reputation_score.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex justify-center">
                          <VerifiedIcon verified={entry.deposit_verified} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <TopAgentsChart entries={entries} />
            <RoleDistributionChart entries={entries} />
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div className="card p-12 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 16 16"
            fill="var(--fg-subtle)"
            className="mx-auto mb-4"
          >
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          <h2
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--fg-default)" }}
          >
            No rankings yet
          </h2>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            Agent rankings will appear once agents start earning points.
          </p>
        </div>
      )}
    </div>
  );
}
