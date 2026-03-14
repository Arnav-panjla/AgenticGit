"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { prApi, repoApi, type PullRequest, type Repository } from "@/lib/api";
import { formatRelativeTime, formatNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { RepoSectionHeader } from "@/components/RepoSectionHeader";

/* ── Inline SVG icons ──────────────────────────────────────────── */

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

function PRIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
  );
}

function MergedIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
    </svg>
  );
}

/* ── Skeletons ─────────────────────────────────────────────────── */

function PRRowSkeleton() {
  return (
    <div
      className="p-4 flex items-center gap-4"
      style={{ borderBottom: "1px solid var(--border-muted)" }}
    >
      <div className="flex-1 flex flex-col gap-2">
        <div className="skeleton" style={{ height: 16, width: "55%" }} />
        <div className="flex gap-3">
          <div className="skeleton" style={{ height: 12, width: 80 }} />
          <div className="skeleton" style={{ height: 12, width: 120 }} />
          <div className="skeleton" style={{ height: 12, width: 60 }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 22, width: 70, borderRadius: 99 }} />
    </div>
  );
}

/* ── Status Filter Tab Data ────────────────────────────────────── */

type FilterStatus = "all" | "open" | "merged" | "rejected";

const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "merged", label: "Merged" },
  { key: "rejected", label: "Rejected" },
];

/* ── Main Page ─────────────────────────────────────────────────── */

export default function PullRequestsPage() {
  const params = useParams();
  const id = params.repoId as string;

  const [repo, setRepo] = useState<Repository | null>(null);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Load repo + pull requests ────────────────────────────── */
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    Promise.all([
      repoApi.get(id),
      prApi.list(id),
    ])
      .then(([repoData, prData]) => {
        setRepo(repoData);
        setPullRequests(prData);
      })
      .catch((err) =>
        setError(err.message ?? "Failed to load pull requests")
      )
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Compute filter counts ────────────────────────────────── */
  const counts: Record<FilterStatus, number> = {
    all: pullRequests.length,
    open: pullRequests.filter(
      (pr) => pr.status === "open" || pr.status === "approved"
    ).length,
    merged: pullRequests.filter((pr) => pr.status === "merged").length,
    rejected: pullRequests.filter((pr) => pr.status === "rejected").length,
  };

  /* ── Filter PRs ───────────────────────────────────────────── */
  const filteredPRs =
    filter === "all"
      ? pullRequests
      : pullRequests.filter((pr) => {
          if (filter === "open")
            return pr.status === "open" || pr.status === "approved";
          return pr.status === filter;
        });

  /* ── Render ───────────────────────────────────────────────── */

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-2">
          <div className="skeleton" style={{ height: 20, width: 20, borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 24, width: 200 }} />
        </div>
        <div className="skeleton" style={{ height: 14, width: 140 }} />

        {/* Tabs skeleton */}
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 32, width: 80, borderRadius: 6 }}
            />
          ))}
        </div>

        {/* PR list skeleton */}
        <div
          className="card overflow-hidden"
          style={{ border: "1px solid var(--border-default)" }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <PRRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col gap-4">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in">
      <RepoSectionHeader
        repoId={id}
        section="pulls"
        title="Pull Requests"
        titleIcon={<PRIcon />}
        repoLabel={repo?.name ?? "Repository"}
        subtitle="Track open, merged, and rejected changes"
        countLabel={String(pullRequests.length)}
      />

      {/* ── Status Filter Tabs ──────────────────────────────── */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{
          backgroundColor: "var(--bg-subtle)",
          border: "1px solid var(--border-muted)",
        }}
      >
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
            style={{
              color:
                filter === tab.key
                  ? "var(--fg-default)"
                  : "var(--fg-muted)",
              backgroundColor:
                filter === tab.key
                  ? "var(--bg-default)"
                  : "transparent",
              border:
                filter === tab.key
                  ? "1px solid var(--border-default)"
                  : "1px solid transparent",
              cursor: "pointer",
            }}
          >
            {tab.label}
            <span
              className="text-xs px-1.5 rounded-full"
              style={{
                backgroundColor:
                  filter === tab.key
                    ? "var(--bg-subtle)"
                    : "transparent",
                color: "var(--fg-subtle)",
              }}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── PR List ─────────────────────────────────────────── */}
      {filteredPRs.length === 0 ? (
        <div className="card p-10 text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 16 16"
            fill="var(--fg-subtle)"
            className="mx-auto mb-3"
          >
            <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
          </svg>
          <h3
            className="text-base font-semibold mb-1"
            style={{ color: "var(--fg-default)" }}
          >
            No pull requests
          </h3>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            {filter === "all"
              ? "No pull requests have been created yet."
              : `No ${filter} pull requests found.`}
          </p>
        </div>
      ) : (
        <div
          className="card overflow-hidden"
          style={{ border: "1px solid var(--border-default)" }}
        >
          {filteredPRs.map((pr, index) => (
            <div
              key={pr.id}
              className="p-4 transition-colors animate-in"
              style={{
                borderBottom:
                  index < filteredPRs.length - 1
                    ? "1px solid var(--border-muted)"
                    : "none",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-subtle)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div className="flex items-start gap-3">
                {/* PR icon (colored by status) */}
                <div
                  className="mt-0.5 shrink-0"
                  style={{
                    color:
                      pr.status === "merged"
                        ? "var(--purple-fg)"
                        : pr.status === "open" || pr.status === "approved"
                        ? "var(--success-fg)"
                        : pr.status === "rejected"
                        ? "var(--danger-fg)"
                        : "var(--fg-subtle)",
                  }}
                >
                  {pr.status === "merged" ? <MergedIcon /> : <PRIcon />}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--fg-default)" }}
                    >
                      {pr.description || `Pull Request #${pr.id.slice(0, 8)}`}
                    </span>

                    {/* Bounty amount */}
                    {pr.bounty_amount != null && pr.bounty_amount > 0 && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: "var(--accent-subtle)",
                          color: "var(--accent-fg)",
                          border: "1px solid var(--accent-muted)",
                        }}
                      >
                        {formatNumber(pr.bounty_amount)} pts
                      </span>
                    )}
                  </div>

                  {/* Branch flow: source → target */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {pr.source_branch_name && (
                      <span
                        className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: "var(--accent-subtle)",
                          color: "var(--accent-fg)",
                        }}
                      >
                        {pr.source_branch_name}
                      </span>
                    )}
                    <span style={{ color: "var(--fg-subtle)" }}>
                      <ArrowIcon />
                    </span>
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: "var(--bg-subtle)",
                        color: "var(--fg-muted)",
                        border: "1px solid var(--border-muted)",
                      }}
                    >
                      {pr.target_branch_name ?? "main"}
                    </span>
                  </div>

                  {/* Meta row: author, reviewer, time */}
                  <div
                    className="flex items-center gap-3 mt-2 text-xs flex-wrap"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    {/* Author */}
                    {pr.author_ens && (
                      <span className="flex items-center gap-1">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.005 6.005 0 0 1 3.432-5.142 3.999 3.999 0 1 1 5.122 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
                        </svg>
                        <Link
                          href={`/agents/${pr.author_ens}`}
                          className="hover:underline"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {pr.author_ens}
                        </Link>
                      </span>
                    )}

                    {/* Reviewer */}
                    {pr.reviewer_ens && (
                      <span className="flex items-center gap-1">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path d="M9.585.52a2.678 2.678 0 0 0-3.17 0l-.928.68a1.178 1.178 0 0 1-.518.215L3.83 1.59a2.678 2.678 0 0 0-2.24 2.24l-.175 1.14a1.178 1.178 0 0 1-.215.518l-.68.928a2.678 2.678 0 0 0 0 3.17l.68.928c.113.153.186.33.215.518l.175 1.138a2.678 2.678 0 0 0 2.24 2.24l1.138.175c.187.029.365.102.518.215l.928.68a2.678 2.678 0 0 0 3.17 0l.928-.68a1.17 1.17 0 0 1 .518-.215l1.138-.175a2.678 2.678 0 0 0 2.241-2.24l.175-1.138c.029-.187.102-.365.215-.518l.68-.928a2.678 2.678 0 0 0 0-3.17l-.68-.928a1.179 1.179 0 0 1-.215-.518L14.41 3.83a2.678 2.678 0 0 0-2.24-2.24l-1.138-.175a1.18 1.18 0 0 1-.518-.215ZM7.303 1.728l.928-.68a1.178 1.178 0 0 1 1.395 0l.928.68c.348.256.752.423 1.18.489l1.136.174a1.178 1.178 0 0 1 .987.987l.174 1.137c.066.427.233.831.489 1.18l.68.927a1.178 1.178 0 0 1 0 1.394l-.68.928a2.678 2.678 0 0 0-.489 1.18l-.174 1.136a1.178 1.178 0 0 1-.987.987l-1.137.174a2.678 2.678 0 0 0-1.18.489l-.927.68a1.178 1.178 0 0 1-1.394 0l-.928-.68a2.678 2.678 0 0 0-1.18-.489l-1.136-.174a1.178 1.178 0 0 1-.987-.987l-.174-1.137a2.678 2.678 0 0 0-.489-1.18l-.68-.927a1.178 1.178 0 0 1 0-1.394l.68-.928c.256-.349.423-.753.489-1.18l.174-1.136a1.178 1.178 0 0 1 .987-.987l1.137-.174a2.678 2.678 0 0 0 1.18-.489ZM11.28 6.78l-3.75 3.75a.75.75 0 0 1-1.06 0L4.72 8.78a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L7 8.94l3.22-3.22a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z" />
                        </svg>
                        <span>Reviewed by</span>
                        <Link
                          href={`/agents/${pr.reviewer_ens}`}
                          className="hover:underline"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {pr.reviewer_ens}
                        </Link>
                      </span>
                    )}

                    {/* Time */}
                    {pr.status === "merged" && pr.merged_at ? (
                      <span className="flex items-center gap-1">
                        <MergedIcon />
                        Merged {formatRelativeTime(pr.merged_at)}
                      </span>
                    ) : (
                      <span>
                        Opened {formatRelativeTime(pr.created_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div className="shrink-0 mt-0.5">
                  <StatusBadge status={pr.status} size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
