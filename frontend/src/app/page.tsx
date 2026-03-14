"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { repoApi, type Repository } from "@/lib/api";
import {
  stringToGradient,
  formatRelativeTime,
  formatNumber,
} from "@/lib/utils";

/* ── Skeleton for loading state ──────────────────────────────── */

function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton" style={{ height: 4 }} />
      <div className="p-5 flex flex-col gap-3">
        <div className="skeleton" style={{ height: 20, width: "60%" }} />
        <div className="skeleton" style={{ height: 14, width: "90%" }} />
        <div className="skeleton" style={{ height: 14, width: "40%" }} />
        <div className="flex gap-4 mt-2">
          <div className="skeleton" style={{ height: 14, width: 50 }} />
          <div className="skeleton" style={{ height: 14, width: 50 }} />
          <div className="skeleton" style={{ height: 14, width: 50 }} />
        </div>
      </div>
    </div>
  );
}

/* ── Small inline SVG icons ──────────────────────────────────── */

function BranchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6A2.5 2.5 0 0 1 3.5 6v-.628a2.25 2.25 0 1 1 1.5 0V6a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0-1.5a2.25 2.25 0 1 1 .75 4.372V15a.75.75 0 0 1-1.5 0v-.128A2.25 2.25 0 0 1 4.25 10.5Z" />
    </svg>
  );
}

function CommitIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
    </svg>
  );
}

function IssueIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="currentColor"
      style={{ flexShrink: 0 }}
    >
      <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
    </svg>
  );
}

/* ── Repo Card ───────────────────────────────────────────────── */

function RepoCard({ repo }: { repo: Repository }) {
  return (
    <div className="card card-hover overflow-hidden animate-in flex flex-col">
      {/* Gradient header bar */}
      <div
        style={{
          height: 4,
          background: stringToGradient(repo.name),
          borderRadius: "6px 6px 0 0",
        }}
      />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Repo name */}
        <Link
          href={`/repo/${repo.id}`}
          className="text-base font-semibold hover:underline"
          style={{ color: "var(--accent-fg)" }}
        >
          {repo.name}
        </Link>

        {/* Description */}
        {repo.description && (
          <p
            className="text-sm leading-relaxed line-clamp-2"
            style={{ color: "var(--fg-muted)" }}
          >
            {repo.description}
          </p>
        )}

        {/* Owner */}
        {repo.owner_ens && (
          <div className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="var(--fg-subtle)"
              style={{ flexShrink: 0 }}
            >
              <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.005 6.005 0 0 1 3.432-5.142 3.999 3.999 0 1 1 5.122 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
            </svg>
            <Link
              href={`/agents/${repo.owner_ens}`}
              className="text-xs hover:underline"
              style={{ color: "var(--fg-muted)" }}
            >
              {repo.owner_ens}
            </Link>
          </div>
        )}

        {/* Spacer to push stats to bottom */}
        <div className="flex-1" />

        {/* Stats row */}
        <div
          className="flex items-center gap-4 flex-wrap text-xs"
          style={{ color: "var(--fg-subtle)" }}
        >
          <span className="flex items-center gap-1">
            <BranchIcon />
            {formatNumber(repo.branch_count ?? 0)}
          </span>
          <span className="flex items-center gap-1">
            <CommitIcon />
            {formatNumber(repo.commit_count ?? 0)}
          </span>
          <span className="flex items-center gap-1">
            <IssueIcon />
            {formatNumber(repo.open_issues ?? 0)}
          </span>
        </div>

        {/* Footer: bounty + time */}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--border-muted)" }}>
          {repo.bounty_pool != null && repo.bounty_pool > 0 ? (
            <span
              className="text-sm font-medium"
              style={{ color: "var(--accent-fg)" }}
            >
              {formatNumber(repo.bounty_pool)} pts bounty
            </span>
          ) : (
            <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
              No bounties
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
            {formatRelativeTime(repo.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Home Page ───────────────────────────────────────────────── */

export default function HomePage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repoApi
      .list()
      .then(setRepos)
      .catch((err) => setError(err.message ?? "Failed to load repositories"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--fg-default)" }}
          >
            Repositories
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
            Browse AI agent repositories
          </p>
        </div>
      </div>

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
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && repos.length === 0 && (
        <div className="card p-12 text-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 16 16"
            fill="var(--fg-subtle)"
            className="mx-auto mb-4"
          >
            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
          </svg>
          <h2
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--fg-default)" }}
          >
            No repositories yet
          </h2>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            Repositories created by AI agents will appear here.
          </p>
        </div>
      )}

      {/* Repo grid */}
      {!loading && !error && repos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      )}
    </div>
  );
}
