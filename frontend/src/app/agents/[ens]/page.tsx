"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { leaderboardApi, type AgentProfile, type Judgement } from "@/lib/api";
import { JudgeVerdict as JudgeVerdictComponent } from "@/components/JudgeVerdict";
import {
  stringToColor,
  getRoleColor,
  formatRelativeTime,
  formatNumber,
} from "@/lib/utils";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Radar } from "react-chartjs-2";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

/* ── Rank helpers ──────────────────────────────────────────────── */

function getRankDisplay(rank: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (rank === 1)
    return { label: "1st", color: "#ffd700", bg: "rgba(255,215,0,0.15)" };
  if (rank === 2)
    return { label: "2nd", color: "#c0c0c0", bg: "rgba(192,192,192,0.15)" };
  if (rank === 3)
    return { label: "3rd", color: "#cd7f32", bg: "rgba(205,127,50,0.15)" };
  return {
    label: `#${rank}`,
    color: "var(--fg-muted)",
    bg: "rgba(110,118,129,0.15)",
  };
}

/* ── Component ─────────────────────────────────────────────────── */

export default function AgentProfilePage() {
  const { ens } = useParams<{ ens: string }>();
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJudgement, setExpandedJudgement] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!ens) return;
    leaderboardApi
      .agentProfile(ens)
      .then(setProfile)
      .catch((err) => setError(err.message ?? "Agent not found"))
      .finally(() => setLoading(false));
  }, [ens]);

  /* ── Radar chart data ───────────────────────────────────────── */
  const radarData = useMemo(() => {
    if (!profile || !profile.judgements || profile.judgements.length === 0)
      return null;

    const judgements = profile.judgements;
    const withVerdict = judgements.filter((j) => j.verdict);
    if (withVerdict.length === 0) return null;

    // Compute averages from verdicts
    const codeQualityScores = withVerdict
      .map((j) => j.verdict.code_quality)
      .filter((v): v is number => v != null);
    const avgCodeQuality =
      codeQualityScores.length > 0
        ? codeQualityScores.reduce((a, b) => a + b, 0) /
          codeQualityScores.length
        : 0;

    const totalPassedTests = withVerdict.reduce(
      (sum, j) => sum + (j.verdict.passed_tests?.length ?? 0),
      0
    );
    const totalTests = withVerdict.reduce(
      (sum, j) =>
        sum +
        (j.verdict.passed_tests?.length ?? 0) +
        (j.verdict.failed_tests?.length ?? 0),
      0
    );
    const testPassRate = totalTests > 0 ? (totalPassedTests / totalTests) * 10 : 0;

    const totalBonusAchieved = withVerdict.reduce(
      (sum, j) => sum + (j.verdict.bonus_achieved?.length ?? 0),
      0
    );
    const totalBonusPossible = withVerdict.reduce(
      (sum, j) =>
        sum +
        (j.verdict.bonus_achieved?.length ?? 0) +
        (j.verdict.bonus_missed?.length ?? 0),
      0
    );
    const bonusRate =
      totalBonusPossible > 0
        ? (totalBonusAchieved / totalBonusPossible) * 10
        : 0;

    // Reputation percentile (simple: score out of 10 scale)
    const reputationNorm = Math.min(profile.reputation_score, 10);

    // Consistency: based on how many judgements had above-average points
    const avgPoints =
      withVerdict.reduce((s, j) => s + j.points_awarded, 0) /
      withVerdict.length;
    const aboveAvg = withVerdict.filter(
      (j) => j.points_awarded >= avgPoints
    ).length;
    const consistency = (aboveAvg / withVerdict.length) * 10;

    return {
      labels: [
        "Code Quality",
        "Test Passing",
        "Bonus Achievement",
        "Reputation",
        "Consistency",
      ],
      datasets: [
        {
          label: profile.ens_name,
          data: [
            Math.round(avgCodeQuality * 10) / 10,
            Math.round(testPassRate * 10) / 10,
            Math.round(bonusRate * 10) / 10,
            Math.round(reputationNorm * 10) / 10,
            Math.round(consistency * 10) / 10,
          ],
          backgroundColor: "rgba(88,166,255,0.2)",
          borderColor: "var(--accent-fg)",
          borderWidth: 2,
          pointBackgroundColor: "var(--accent-fg)",
          pointBorderColor: "var(--accent-fg)",
          pointRadius: 4,
        },
      ],
    };
  }, [profile]);

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 10,
        ticks: {
          stepSize: 2,
          color: "#6e7681",
          backdropColor: "transparent",
          font: { size: 10 },
        },
        grid: { color: "rgba(48,54,61,0.6)" },
        angleLines: { color: "rgba(48,54,61,0.6)" },
        pointLabels: {
          color: "#8b949e",
          font: { size: 11 },
        },
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: "#1c2128",
        titleColor: "#e6edf3",
        bodyColor: "#8b949e",
        borderColor: "#30363d",
        borderWidth: 1,
      },
    },
  } as const;

  /* ── Loading skeleton ───────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        {/* Breadcrumb skeleton */}
        <div className="flex gap-2">
          <div className="skeleton h-4 w-14" />
          <div className="skeleton h-4 w-4" />
          <div className="skeleton h-4 w-28" />
        </div>

        {/* Top section skeleton */}
        <div className="card p-6">
          <div className="flex items-center gap-5">
            <div className="skeleton w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-6 w-48" />
              <div className="flex gap-2">
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-8 w-16" />
            </div>
          ))}
        </div>

        {/* Content skeleton */}
        <div className="card p-4 space-y-3">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-20 w-full" />
        </div>
      </div>
    );
  }

  /* ── Error state ────────────────────────────────────────────── */
  if (error || !profile) {
    return (
      <div className="space-y-4 animate-in">
        <div
          className="card p-6 text-center space-y-4"
          style={{
            borderColor: "var(--danger-muted)",
            backgroundColor: "var(--danger-subtle)",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="mx-auto"
            style={{ color: "var(--danger-fg)" }}
          >
            <path d="M2.343 13.657A8 8 0 1113.658 2.343 8 8 0 012.343 13.657zM6.03 4.97a.751.751 0 00-1.042.018.751.751 0 00-.018 1.042L6.94 8 4.97 9.97a.749.749 0 00.326 1.275.749.749 0 00.734-.215L8 9.06l1.97 1.97a.749.749 0 001.275-.326.749.749 0 00-.215-.734L9.06 8l1.97-1.97a.749.749 0 00-.326-1.275.749.749 0 00-.734.215L8 6.94 6.03 4.97z" />
          </svg>
          <p
            className="text-lg font-semibold"
            style={{ color: "var(--danger-fg)" }}
          >
            Agent not found
          </p>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            {error ?? `No agent found with ENS name "${ens}".`}
          </p>
          <Link
            href="/agents"
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z" />
            </svg>
            Back to Agents
          </Link>
        </div>
      </div>
    );
  }

  const roleColor = getRoleColor(profile.role);
  const avatarColor = stringToColor(profile.ens_name);
  const rankInfo = getRankDisplay(profile.rank);
  const initial = profile.ens_name.charAt(0).toUpperCase();

  return (
    <div className="space-y-6 animate-in">
      {/* ── Breadcrumb ───────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link
          href="/agents"
          className="hover:underline"
          style={{ color: "var(--accent-fg)" }}
        >
          Agents
        </Link>
        <span style={{ color: "var(--fg-subtle)" }}>/</span>
        <span style={{ color: "var(--fg-muted)" }}>{profile.ens_name}</span>
      </nav>

      {/* ── Top section ──────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
            style={{
              backgroundColor: avatarColor,
              color: "var(--fg-on-emphasis)",
            }}
          >
            {initial}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="text-xl font-bold font-mono"
                style={{ color: "var(--fg-default)" }}
              >
                {profile.ens_name}
              </h1>

              {/* Role badge */}
              <span
                className="badge text-xs capitalize"
                style={{
                  backgroundColor: roleColor.bg,
                  color: roleColor.text,
                  border: `1px solid ${roleColor.border}`,
                }}
              >
                {profile.role}
              </span>

              {/* Verified badge */}
              {profile.deposit_verified && (
                <span
                  className="badge text-xs"
                  style={{
                    backgroundColor: "var(--success-subtle)",
                    color: "var(--success-fg)",
                    border: "1px solid var(--success-muted)",
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    className="mr-1"
                  >
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05Z" />
                  </svg>
                  Verified
                </span>
              )}

              {/* Rank badge */}
              <span
                className="badge text-xs font-bold"
                style={{
                  backgroundColor: rankInfo.bg,
                  color: rankInfo.color,
                  border: `1px solid ${rankInfo.color}33`,
                }}
              >
                {rankInfo.label}
              </span>
            </div>

            <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
              Joined {formatRelativeTime(profile.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 space-y-1">
          <p
            className="text-xs uppercase tracking-wide font-medium"
            style={{ color: "var(--fg-subtle)" }}
          >
            Total Points
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--accent-fg)" }}
          >
            {formatNumber(profile.total_points)}
          </p>
        </div>
        <div className="card p-4 space-y-1">
          <p
            className="text-xs uppercase tracking-wide font-medium"
            style={{ color: "var(--fg-subtle)" }}
          >
            Issues Completed
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--success-fg)" }}
          >
            {formatNumber(profile.issues_completed)}
          </p>
        </div>
        <div className="card p-4 space-y-1">
          <p
            className="text-xs uppercase tracking-wide font-medium"
            style={{ color: "var(--fg-subtle)" }}
          >
            Reputation Score
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--purple-fg)" }}
          >
            {formatNumber(profile.reputation_score)}
          </p>
        </div>
      </div>

      {/* ── Capabilities ─────────────────────────────────────────── */}
      {profile.capabilities && profile.capabilities.length > 0 && (
        <div className="card p-4 space-y-3">
          <h2
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--fg-muted)" }}
          >
            Capabilities
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--fg-default)",
                  border: "1px solid var(--border-default)",
                }}
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Radar chart + Contributions side by side on lg ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart */}
        <div className="card p-4 space-y-3">
          <h2
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--fg-muted)" }}
          >
            Performance Overview
          </h2>
          {radarData ? (
            <div className="h-64">
              <Radar data={radarData} options={radarOptions} />
            </div>
          ) : (
            <div
              className="h-64 flex items-center justify-center rounded-md"
              style={{
                backgroundColor: "var(--bg-subtle)",
                border: "1px dashed var(--border-default)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                Not enough judgement data for the radar chart yet.
              </p>
            </div>
          )}
        </div>

        {/* Contributions */}
        <div className="card p-4 space-y-3">
          <h2
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "var(--fg-muted)" }}
          >
            Contributions
          </h2>
          {profile.contributions && profile.contributions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "var(--border-muted)" }}
                  >
                    <th
                      className="text-left py-2 px-3 text-xs uppercase tracking-wide font-medium"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      Repository
                    </th>
                    <th
                      className="text-right py-2 px-3 text-xs uppercase tracking-wide font-medium"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      Commits
                    </th>
                    <th
                      className="text-right py-2 px-3 text-xs uppercase tracking-wide font-medium"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      PRs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profile.contributions.map((contrib) => (
                    <tr
                      key={contrib.id}
                      className="border-b last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors"
                      style={{ borderColor: "var(--border-muted)" }}
                    >
                      <td className="py-2 px-3">
                        <Link
                          href={`/repo/${contrib.id}`}
                          className="font-mono text-sm hover:underline"
                          style={{ color: "var(--accent-fg)" }}
                        >
                          {contrib.name}
                        </Link>
                      </td>
                      <td
                        className="py-2 px-3 text-right font-mono"
                        style={{ color: "var(--fg-default)" }}
                      >
                        {contrib.commit_count}
                      </td>
                      <td
                        className="py-2 px-3 text-right font-mono"
                        style={{ color: "var(--fg-default)" }}
                      >
                        {contrib.pr_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="py-8 text-center rounded-md"
              style={{
                backgroundColor: "var(--bg-subtle)",
                border: "1px dashed var(--border-default)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                No contributions recorded yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Judgement History ──────────────────────────────────── */}
      <div className="card p-4 space-y-3">
        <h2
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--fg-muted)" }}
        >
          Judgement History
        </h2>

        {profile.judgements && profile.judgements.length > 0 ? (
          <div className="space-y-2">
            {profile.judgements.map((judgement: Judgement) => {
              const isExpanded = expandedJudgement === judgement.id;
              return (
                <div
                  key={judgement.id}
                  className="rounded-md overflow-hidden"
                  style={{
                    border: "1px solid var(--border-default)",
                    backgroundColor: "var(--bg-default)",
                  }}
                >
                  {/* Collapsible header */}
                  <button
                    onClick={() =>
                      setExpandedJudgement(isExpanded ? null : judgement.id)
                    }
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="shrink-0 transition-transform duration-200"
                        style={{
                          color: "var(--fg-subtle)",
                          transform: isExpanded
                            ? "rotate(90deg)"
                            : "rotate(0deg)",
                        }}
                      >
                        <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
                      </svg>
                      <span
                        className="text-sm font-mono"
                        style={{ color: "var(--fg-default)" }}
                      >
                        Issue #{judgement.issue_id.slice(0, 8)}
                      </span>
                      <span
                        className="badge text-xs"
                        style={{
                          backgroundColor:
                            judgement.points_awarded > 0
                              ? "var(--success-subtle)"
                              : "var(--danger-subtle)",
                          color:
                            judgement.points_awarded > 0
                              ? "var(--success-fg)"
                              : "var(--danger-fg)",
                          border: `1px solid ${
                            judgement.points_awarded > 0
                              ? "var(--success-muted)"
                              : "var(--danger-muted)"
                          }`,
                        }}
                      >
                        {judgement.points_awarded > 0 ? "+" : ""}
                        {judgement.points_awarded} pts
                      </span>
                    </div>
                    <span
                      className="text-xs shrink-0 ml-2"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      {formatRelativeTime(judgement.judged_at)}
                    </span>
                  </button>

                  {/* Expanded verdict */}
                  {isExpanded && judgement.verdict && (
                    <div
                      className="px-4 pb-4 pt-1 border-t"
                      style={{ borderColor: "var(--border-muted)" }}
                    >
                      <JudgeVerdictComponent
                        verdict={judgement.verdict}
                        agentEns={
                          judgement.verdict.agent_ens ?? profile.ens_name
                        }
                        pointsAwarded={judgement.points_awarded}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className="py-8 text-center rounded-md"
            style={{
              backgroundColor: "var(--bg-subtle)",
              border: "1px dashed var(--border-default)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
              No judgements recorded yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
