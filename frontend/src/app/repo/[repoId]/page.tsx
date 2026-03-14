"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  repoApi,
  type Repository,
  type Branch,
  type Commit,
  type WorkflowRun,
} from "@/lib/api";
import {
  stringToGradient,
  formatRelativeTime,
  formatNumber,
} from "@/lib/utils";
import { CommitCard } from "@/components/CommitCard";
import { ContextChain } from "@/components/ContextChain";
import { RepoSectionHeader } from "@/components/RepoSectionHeader";

/* ── Inline SVG icons ──────────────────────────────────────────── */

function RepoIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.25.25 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
    </svg>
  );
}

function BranchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6A2.5 2.5 0 0 1 3.5 6v-.628a2.25 2.25 0 1 1 1.5 0V6a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0-1.5a2.25 2.25 0 1 1 .75 4.372V15a.75.75 0 0 1-1.5 0v-.128A2.25 2.25 0 0 1 4.25 10.5Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L8 8.94l3.72-3.72a.749.749 0 0 1 1.06 0Z" />
    </svg>
  );
}

/* ── Content type indicator ────────────────────────────────────── */

function ContentTypeBadge({ type }: { type: string }) {
  const styles: Record<string, { color: string; label: string }> = {
    text: { color: "var(--fg-muted)", label: "Text" },
    embedding: { color: "var(--purple-fg)", label: "Embedding" },
    file: { color: "var(--accent-fg)", label: "File" },
    trace: { color: "var(--warning-fg)", label: "Trace" },
  };
  const s = styles[type] ?? { color: "var(--fg-subtle)", label: type };

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono"
      style={{
        color: s.color,
        backgroundColor: "var(--bg-subtle)",
        border: "1px solid var(--border-muted)",
      }}
    >
      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3.75 1.5a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.5Zm5.75 0v2.75c0 .138.112.25.25.25h2.75L9.5 1.5ZM2 1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25Z" />
      </svg>
      {s.label}
    </span>
  );
}

/* ── Skeletons ─────────────────────────────────────────────────── */

function HeaderSkeleton() {
  return (
    <div className="card p-6 animate-in">
      <div className="flex flex-col gap-3">
        <div className="skeleton" style={{ height: 24, width: "40%" }} />
        <div className="skeleton" style={{ height: 16, width: "70%" }} />
        <div className="flex gap-4 mt-1">
          <div className="skeleton" style={{ height: 14, width: 100 }} />
          <div className="skeleton" style={{ height: 14, width: 80 }} />
        </div>
      </div>
    </div>
  );
}

function CommitSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <div className="skeleton" style={{ height: 16, width: "70%" }} />
          <div className="skeleton" style={{ height: 12, width: "40%" }} />
        </div>
        <div className="skeleton" style={{ height: 12, width: 60 }} />
      </div>
      <div className="skeleton mt-2" style={{ height: 14, width: "85%" }} />
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */

export default function RepoDetailPage() {
  const params = useParams();
  const id = params.repoId as string;

  const [repo, setRepo] = useState<Repository | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [searchResults, setSearchResults] = useState<
    (Commit & { similarity?: number })[] | null
  >(null);
  const [failures, setFailures] = useState<Commit[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [activeTab, setActiveTab] = useState<"commits" | "failures" | "workflows">("commits");

  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [failuresLoading, setFailuresLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Load repo + branches ─────────────────────────────────── */
  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    Promise.all([repoApi.get(id), repoApi.branches(id)])
      .then(([repoData, branchData]) => {
        setRepo(repoData);
        setBranches(branchData);

        // Default to "main" branch, or first branch
        const defaultBranch =
          branchData.find((b) => b.name === "main") ?? branchData[0] ?? null;
        setSelectedBranch(defaultBranch?.name ?? null);
      })
      .catch((err) => setError(err.message ?? "Failed to load repository"))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Load commits when branch changes ─────────────────────── */
  const loadCommits = useCallback(
    (branch: string | null) => {
      if (!id) return;

      setCommitsLoading(true);
      repoApi
        .commits(id, "public", branch ?? undefined)
        .then(setCommits)
        .catch(() => setCommits([]))
        .finally(() => setCommitsLoading(false));
    },
    [id]
  );

  useEffect(() => {
    if (!loading && selectedBranch !== null) {
      loadCommits(selectedBranch);
    }
    // Also load when loading finishes with a selected branch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, loading, loadCommits]);

  /* ── Semantic search ──────────────────────────────────────── */
  const handleSearch = useCallback(() => {
    if (!id || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    repoApi
      .searchCommits(id, searchQuery.trim())
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [id, searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  /* ── Load failures ────────────────────────────────────────── */
  const loadFailures = useCallback(() => {
    if (!id) return;
    setFailuresLoading(true);
    repoApi
      .searchFailures(id)
      .then(setFailures)
      .catch(() => setFailures([]))
      .finally(() => setFailuresLoading(false));
  }, [id]);

  /* ── Load workflow runs ───────────────────────────────────── */
  const loadWorkflowRuns = useCallback(() => {
    if (!id) return;
    repoApi
      .workflowRuns(id, 20)
      .then(setWorkflowRuns)
      .catch(() => setWorkflowRuns([]));
  }, [id]);

  /* Load failures/workflows when tab changes */
  useEffect(() => {
    if (activeTab === "failures" && failures.length === 0) {
      loadFailures();
    }
    if (activeTab === "workflows" && workflowRuns.length === 0) {
      loadWorkflowRuns();
    }
  }, [activeTab, failures.length, workflowRuns.length, loadFailures, loadWorkflowRuns]);

  /* ── Render ───────────────────────────────────────────────── */

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <HeaderSkeleton />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 36, width: 100, borderRadius: 6 }}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <CommitSkeleton key={i} />
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

  if (!repo) return null;

  const displayedCommits: (Commit & { similarity?: number })[] =
    searchResults ?? commits;

  return (
    <div className="flex flex-col gap-6 animate-in">
      <RepoSectionHeader
        repoId={id}
        section="code"
        title="Code"
        repoLabel={repo.name}
        subtitle="Browse commits and semantic history"
        countLabel={`${formatNumber(commits.length)} commits`}
      />

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {/* Gradient accent bar */}
        <div
          style={{
            height: 4,
            background: stringToGradient(repo.name),
          }}
        />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Repo name */}
              <div className="flex items-center gap-2.5">
                <span style={{ color: "var(--fg-subtle)" }}>
                  <RepoIcon />
                </span>
                <h1
                  className="text-xl font-bold truncate"
                  style={{ color: "var(--fg-default)" }}
                >
                  {repo.name}
                </h1>
              </div>

              {/* Description */}
              {repo.description && (
                <p
                  className="text-sm mt-2 leading-relaxed"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {repo.description}
                </p>
              )}

              {/* Meta row: owner + stats */}
              <div
                className="flex items-center gap-4 mt-3 flex-wrap text-sm"
                style={{ color: "var(--fg-subtle)" }}
              >
                {repo.owner_ens && (
                  <Link
                    href={`/agents/${repo.owner_ens}`}
                    className="flex items-center gap-1.5 hover:underline"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.005 6.005 0 0 1 3.432-5.142 3.999 3.999 0 1 1 5.122 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
                    </svg>
                    {repo.owner_ens}
                  </Link>
                )}

                <span className="flex items-center gap-1">
                  <BranchIcon />
                  {formatNumber(repo.branch_count ?? 0)} branches
                </span>

                <span className="flex items-center gap-1">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
                  </svg>
                  {formatNumber(repo.commit_count ?? 0)} commits
                </span>

                <span
                  className="text-xs"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  Created {formatRelativeTime(repo.created_at)}
                </span>
              </div>
            </div>

            {/* Bounty pool */}
            {repo.bounty_pool != null && repo.bounty_pool > 0 && (
              <div
                className="shrink-0 text-right px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: "var(--accent-subtle)",
                  border: "1px solid var(--accent-muted)",
                }}
              >
                <div
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  Bounty Pool
                </div>
                <div
                  className="text-lg font-bold mt-0.5"
                  style={{ color: "var(--accent-fg)" }}
                >
                  {formatNumber(repo.bounty_pool)} pts
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Branch Selector + Search Bar ────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Branch selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
            className="btn-secondary flex items-center gap-2 text-sm px-3 py-1.5"
          >
            <BranchIcon />
            <span className="font-mono text-xs">
              {selectedBranch ?? "No branches"}
            </span>
            <ChevronDownIcon />
          </button>

          {branchDropdownOpen && branches.length > 0 && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setBranchDropdownOpen(false)}
              />
              <div
                className="absolute top-full left-0 mt-1 z-20 min-w-[220px] rounded-lg overflow-hidden shadow-lg"
                style={{
                  backgroundColor: "var(--bg-default)",
                  border: "1px solid var(--border-default)",
                }}
              >
                <div
                  className="px-3 py-2 text-xs font-semibold"
                  style={{
                    color: "var(--fg-default)",
                    borderBottom: "1px solid var(--border-muted)",
                  }}
                >
                  Switch branch
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setSelectedBranch(branch.name);
                        setBranchDropdownOpen(false);
                        clearSearch();
                      }}
                      className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                      style={{
                        color:
                          branch.name === selectedBranch
                            ? "var(--fg-default)"
                            : "var(--fg-muted)",
                        backgroundColor:
                          branch.name === selectedBranch
                            ? "var(--bg-subtle)"
                            : "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (branch.name !== selectedBranch) {
                          e.currentTarget.style.backgroundColor =
                            "var(--bg-subtle)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (branch.name !== selectedBranch) {
                          e.currentTarget.style.backgroundColor =
                            "transparent";
                        }
                      }}
                    >
                      {branch.name === selectedBranch && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                        >
                          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                        </svg>
                      )}
                      {branch.name !== selectedBranch && (
                        <span className="w-3.5" />
                      )}
                      <span className="font-mono text-xs">{branch.name}</span>
                      {branch.commit_count != null && (
                        <span
                          className="ml-auto text-xs"
                          style={{ color: "var(--fg-subtle)" }}
                        >
                          {branch.commit_count} commits
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Semantic search bar */}
        <div className="flex-1 relative">
          <div className="flex items-center gap-0">
            <div className="relative flex-1">
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--fg-subtle)" }}
              >
                <SearchIcon />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) {
                    setSearchResults(null);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="Search commits semantically..."
                className="input w-full pl-9 pr-3 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || searchLoading}
              className="btn-primary text-sm px-4 py-1.5 ml-2 whitespace-nowrap"
              style={{ opacity: !searchQuery.trim() ? 0.5 : 1 }}
            >
              {searchLoading ? "Searching..." : "Search"}
            </button>
            {searchResults !== null && (
              <button
                onClick={clearSearch}
                className="btn-secondary text-sm px-3 py-1.5 ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Search results indicator ────────────────────────── */}
      {searchResults !== null && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: "var(--accent-subtle)",
            border: "1px solid var(--accent-muted)",
            color: "var(--accent-fg)",
          }}
        >
          <SearchIcon />
          <span>
            Found {searchResults.length} result
            {searchResults.length !== 1 ? "s" : ""} for &quot;{searchQuery}
            &quot;
          </span>
        </div>
      )}

      {/* ── Tab buttons (v5) ───────────────────────────────────── */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: "var(--bg-subtle)" }}
      >
        {(["commits", "failures", "workflows"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab ? "var(--bg-default)" : "transparent",
              color: activeTab === tab ? "var(--fg-default)" : "var(--fg-muted)",
              border: activeTab === tab ? "1px solid var(--border-muted)" : "1px solid transparent",
            }}
          >
            {tab === "commits" && "Commits"}
            {tab === "failures" && (
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575ZM8 5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 5Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                </svg>
                Failures
              </span>
            )}
            {tab === "workflows" && (
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.5 1.75v11.5c0 .138.112.25.25.25h3.17a.75.75 0 0 1 0 1.5H2.75A1.75 1.75 0 0 1 1 13.25V1.75C1 .784 1.784 0 2.75 0h8.5C12.216 0 13 .784 13 1.75v7.736a.75.75 0 0 1-1.5 0V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm10.28 7.97a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06l1.72 1.72 3.72-3.72a.75.75 0 0 1 1.06 0Z" />
                </svg>
                Workflow Runs
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Agent Context Chain ──────────────────────────────── */}
      {!searchResults && activeTab === "commits" && (
        <ContextChain repoId={id} branch={selectedBranch ?? undefined} />
      )}

      {/* ── Commit List (commits tab) ──────────────────────── */}
      {activeTab === "commits" && (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--fg-default)" }}
          >
            {searchResults !== null
              ? "Search Results"
              : `Commits on ${selectedBranch ?? "—"}`}
          </h2>
          {!searchResults && (
            <span
              className="text-xs"
              style={{ color: "var(--fg-subtle)" }}
            >
              {commits.length} commit{commits.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Loading commits */}
        {(commitsLoading || searchLoading) && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <CommitSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!commitsLoading &&
          !searchLoading &&
          displayedCommits.length === 0 && (
            <div className="card p-10 text-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 16 16"
                fill="var(--fg-subtle)"
                className="mx-auto mb-3"
              >
                <path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
              </svg>
              <h3
                className="text-base font-semibold mb-1"
                style={{ color: "var(--fg-default)" }}
              >
                {searchResults !== null
                  ? "No matching commits"
                  : "No commits yet"}
              </h3>
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                {searchResults !== null
                  ? "Try a different search query."
                  : "Commits pushed to this branch will appear here."}
              </p>
            </div>
          )}

        {/* Commit cards */}
        {!commitsLoading &&
          !searchLoading &&
          displayedCommits.length > 0 &&
          displayedCommits.map((commit) => (
            <div key={commit.id} className="relative">
              {/* Similarity score for search results */}
              {"similarity" in commit &&
                commit.similarity != null && (
                  <div
                    className="absolute -top-2 right-3 z-10 px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: "var(--accent-subtle)",
                      color: "var(--accent-fg)",
                      border: "1px solid var(--accent-muted)",
                    }}
                  >
                    {(Number(commit.similarity ?? 0) * 100).toFixed(1)}% match
                  </div>
                )}

              <CommitCard commit={commit} />

              {/* Content type indicator below the commit card */}
              {commit.content_type && (
                <div className="mt-1 ml-4">
                  <ContentTypeBadge type={commit.content_type} />
                </div>
              )}
            </div>
          ))}
      </div>
      )}

      {/* ── Failures Tab (v5) ──────────────────────────────── */}
      {activeTab === "failures" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--fg-default)" }}
            >
              Failed Approaches
            </h2>
            <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
              {failures.length} failure{failures.length !== 1 ? "s" : ""}
            </span>
          </div>

          {failuresLoading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CommitSkeleton key={i} />
              ))}
            </div>
          )}

          {!failuresLoading && failures.length === 0 && (
            <div className="card p-10 text-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 16 16"
                fill="var(--success-fg)"
                className="mx-auto mb-3"
              >
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
              <h3
                className="text-base font-semibold mb-1"
                style={{ color: "var(--fg-default)" }}
              >
                No failed approaches recorded
              </h3>
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                Commits tagged with failure context will appear here.
              </p>
            </div>
          )}

          {!failuresLoading && failures.length > 0 &&
            failures.map((commit) => (
              <CommitCard key={commit.id} commit={commit} />
            ))
          }
        </div>
      )}

      {/* ── Workflow Runs Tab (v5) ─────────────────────────── */}
      {activeTab === "workflows" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--fg-default)" }}
            >
              Workflow Runs
            </h2>
            <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
              {workflowRuns.length} run{workflowRuns.length !== 1 ? "s" : ""}
            </span>
          </div>

          {workflowRuns.length === 0 && (
            <div className="card p-10 text-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 16 16"
                fill="var(--fg-subtle)"
                className="mx-auto mb-3"
              >
                <path d="M2.5 1.75v11.5c0 .138.112.25.25.25h3.17a.75.75 0 0 1 0 1.5H2.75A1.75 1.75 0 0 1 1 13.25V1.75C1 .784 1.784 0 2.75 0h8.5C12.216 0 13 .784 13 1.75v7.736a.75.75 0 0 1-1.5 0V1.75a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm10.28 7.97a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0l-2.25-2.25a.75.75 0 1 1 1.06-1.06l1.72 1.72 3.72-3.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
              <h3
                className="text-base font-semibold mb-1"
                style={{ color: "var(--fg-default)" }}
              >
                No workflow runs yet
              </h3>
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                Workflow checks will run automatically on new commits.
              </p>
            </div>
          )}

          {workflowRuns.length > 0 &&
            workflowRuns.map((run) => {
              const statusColor =
                run.status === "passed"
                  ? "var(--success-fg)"
                  : run.status === "failed"
                    ? "var(--danger-fg)"
                    : run.status === "warning"
                      ? "var(--warning-fg)"
                      : "var(--fg-muted)";

              return (
                <div
                  key={run.id}
                  className="card card-hover p-4 animate-in"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {/* Status dot */}
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: statusColor }}
                        />
                        <span
                          className="text-sm font-semibold"
                          style={{ color: "var(--fg-default)" }}
                        >
                          {run.event_type === "commit" ? "Commit" : run.event_type === "pr_open" ? "PR Opened" : "PR Merged"} Check
                        </span>
                        <span
                          className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: statusColor + "20", color: statusColor }}
                        >
                          {run.status}
                        </span>
                      </div>
                      {run.summary && (
                        <p className="text-xs mt-1.5" style={{ color: "var(--fg-muted)" }}>
                          {run.summary}
                        </p>
                      )}
                      {/* Individual checks */}
                      {run.checks && run.checks.length > 0 && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {run.checks.map((check, i) => {
                            const checkColor =
                              check.status === "passed"
                                ? "var(--success-fg)"
                                : check.status === "failed"
                                  ? "var(--danger-fg)"
                                  : check.status === "warning"
                                    ? "var(--warning-fg)"
                                    : "var(--fg-subtle)";
                            return (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                                style={{
                                  backgroundColor: checkColor + "15",
                                  color: checkColor,
                                  border: `1px solid ${checkColor}40`,
                                }}
                                title={check.message}
                              >
                                {check.status === "passed" && (
                                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                                  </svg>
                                )}
                                {check.status === "failed" && (
                                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
                                  </svg>
                                )}
                                {check.status === "warning" && (
                                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Z" />
                                  </svg>
                                )}
                                {check.name.replace(/_/g, " ")}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span
                      className="text-xs whitespace-nowrap shrink-0"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      {formatRelativeTime(run.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
