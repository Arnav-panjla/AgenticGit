"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  issueApi,
  agentApi,
  bountyApi,
  type Issue,
  type Judgement,
  type Agent,
  type IssueBounty,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeTime, getDifficultyStyle } from "@/lib/utils";
import { ScoreCard } from "@/components/ScoreCard";
import { JudgeVerdict as JudgeVerdictComponent } from "@/components/JudgeVerdict";
import { StatusBadge } from "@/components/StatusBadge";

// ── Agent Selection Modal ─────────────────────────────────────

function AgentSelectionModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ens: string) => void;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    agentApi
      .list()
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-full max-w-md max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between pb-4 mb-4 border-b"
          style={{ borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--fg-default)" }}
          >
            Assign Agent
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-subtle)] transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <p
            className="text-sm text-center py-8"
            style={{ color: "var(--fg-muted)" }}
          >
            No agents available
          </p>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ border: "1px solid var(--border-muted)" }}
                onClick={() => {
                  onSelect(agent.ens_name);
                  onClose();
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    backgroundColor: "var(--accent-subtle)",
                    color: "var(--accent-fg)",
                    border: "1px solid var(--accent-muted)",
                  }}
                >
                  {agent.ens_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-mono font-medium truncate"
                    style={{ color: "var(--fg-default)" }}
                  >
                    {agent.ens_name}
                  </div>
                  <div
                    className="text-xs capitalize"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {agent.role} &middot; Rep {agent.reputation_score}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Submit Solution Modal ─────────────────────────────────────

function SubmitSolutionModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(content.trim());
      setContent("");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between pb-4 mb-4 border-b"
          style={{ borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--fg-default)" }}
          >
            Submit Solution
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-subtle)] transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--danger-subtle)",
              color: "var(--danger-fg)",
              border: "1px solid var(--danger-muted)",
            }}
          >
            {error}
          </div>
        )}

        <textarea
          className="input w-full min-h-[200px] resize-y font-mono text-sm"
          placeholder="Paste your solution content here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div
          className="flex items-center justify-end gap-3 pt-4 mt-4 border-t"
          style={{ borderColor: "var(--border-default)" }}
        >
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Post Bounty Modal ─────────────────────────────────────────

function PostBountyModal({
  isOpen,
  onClose,
  onPost,
}: {
  isOpen: boolean;
  onClose: () => void;
  onPost: (data: {
    amount: number;
    deadline_hours: number;
    max_submissions: number;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState<string>("");
  const [deadlineHours, setDeadlineHours] = useState<string>("48");
  const [maxSubmissions, setMaxSubmissions] = useState<string>("5");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onPost({
        amount: Number(amount),
        deadline_hours: Number(deadlineHours) || 48,
        max_submissions: Number(maxSubmissions) || 5,
      });
      setAmount("");
      setDeadlineHours("48");
      setMaxSubmissions("5");
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post bounty");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between pb-4 mb-4 border-b"
          style={{ borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--fg-default)" }}
          >
            Post Bounty
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-subtle)] transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--danger-subtle)",
              color: "var(--danger-fg)",
              border: "1px solid var(--danger-muted)",
            }}
          >
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--fg-default)" }}
            >
              Amount <span style={{ color: "var(--danger-fg)" }}>*</span>
            </label>
            <input
              className="input w-full"
              type="number"
              min="1"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs mt-1" style={{ color: "var(--fg-subtle)" }}>
              Tokens to award the bounty winner
            </p>
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--fg-default)" }}
            >
              Deadline (hours)
            </label>
            <input
              className="input w-full"
              type="number"
              min="1"
              placeholder="48"
              value={deadlineHours}
              onChange={(e) => setDeadlineHours(e.target.value)}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--fg-default)" }}
            >
              Max Submissions
            </label>
            <input
              className="input w-full"
              type="number"
              min="1"
              placeholder="5"
              value={maxSubmissions}
              onChange={(e) => setMaxSubmissions(e.target.value)}
            />
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-3 pt-4 mt-4 border-t"
          style={{ borderColor: "var(--border-default)" }}
        >
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={submitting || !amount}
          >
            {submitting ? "Posting..." : "Post Bounty"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.repoId as string;
  const issueId = params.issueId as string;
  const { isAuthenticated, selectedAgent } = useAuth();

  const [issue, setIssue] = useState<
    (Issue & { judgements?: Judgement[] }) | null
  >(null);
  const [bounty, setBounty] = useState<IssueBounty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showBountyModal, setShowBountyModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchIssue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [issueData, bountyData] = await Promise.allSettled([
        issueApi.get(repoId, issueId),
        bountyApi.get(repoId, issueId),
      ]);

      if (issueData.status === "fulfilled") {
        setIssue(issueData.value);
      } else {
        setError("Issue not found");
        return;
      }

      if (bountyData.status === "fulfilled") {
        setBounty(bountyData.value);
      }
      // bounty may not exist — that's fine
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load issue");
    } finally {
      setLoading(false);
    }
  }, [repoId, issueId]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  // ── Actions ───────────────────────────────────────────────────

  const handleAssign = async (agentEns: string) => {
    setActionLoading(true);
    try {
      await issueApi.assign(repoId, issueId, agentEns);
      await fetchIssue();
    } catch {
      // silently fail — could show toast
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitSolution = async (content: string) => {
    if (!selectedAgent) return;
    await issueApi.submit(repoId, issueId, {
      agent_ens: selectedAgent.ens_name,
      content,
    });
    await fetchIssue();
  };

  const handleCloseIssue = async () => {
    if (!selectedAgent) return;
    setActionLoading(true);
    try {
      await issueApi.close(repoId, issueId, {
        agent_ens: selectedAgent.ens_name,
      });
      await fetchIssue();
    } catch {
      // silently fail
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostBounty = async (data: {
    amount: number;
    deadline_hours: number;
    max_submissions: number;
  }) => {
    if (!selectedAgent) return;
    await bountyApi.post(repoId, issueId, {
      agent_ens: selectedAgent.ens_name,
      ...data,
    });
    await fetchIssue();
  };

  const issueIdShort = issueId.slice(0, 8);

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-1.5">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton h-4 w-4" />
          <div className="skeleton h-4 w-16" />
          <div className="skeleton h-4 w-4" />
          <div className="skeleton h-4 w-24" />
        </div>

        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="skeleton h-8 w-3/4" />
          <div className="flex gap-3">
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-6 w-32" />
          </div>
        </div>

        {/* Two column skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6 space-y-3">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-5/6" />
              <div className="skeleton h-4 w-4/6" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <div className="skeleton h-5 w-24" />
              <div className="skeleton h-16 w-full" />
            </div>
            <div className="card p-4 space-y-3">
              <div className="skeleton h-5 w-20" />
              <div className="skeleton h-9 w-full rounded-lg" />
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (error || !issue) {
    return (
      <div className="animate-in space-y-4">
        <div
          className="card p-6 text-center space-y-3"
          style={{
            borderColor: "var(--danger-muted)",
            backgroundColor: "var(--danger-subtle)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="mx-auto"
            style={{ color: "var(--danger-fg)" }}
          >
            <path d="M2.343 13.657A8 8 0 1113.658 2.343 8 8 0 012.343 13.657zM6.03 4.97a.751.751 0 00-1.042.018.751.751 0 00-.018 1.042L6.94 8 4.97 9.97a.749.749 0 00.326 1.275.749.749 0 00.734-.215L8 9.06l1.97 1.97a.749.749 0 001.275-.326.749.749 0 00-.215-.734L9.06 8l1.97-1.97a.749.749 0 00-.326-1.275.749.749 0 00-.734.215L8 6.94 6.03 4.97z" />
          </svg>
          <p
            className="text-lg font-medium"
            style={{ color: "var(--danger-fg)" }}
          >
            Issue not found
          </p>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            {error ?? "The issue you're looking for doesn't exist or has been removed."}
          </p>
          <Link
            href={`/repo/${repoId}/issues`}
            className="btn-secondary inline-flex items-center gap-2 mt-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z" />
            </svg>
            Back to Issues
          </Link>
        </div>
      </div>
    );
  }

  // ── Main content ──────────────────────────────────────────────
  const judgements = issue.judgements ?? [];
  const isClosedOrCancelled =
    issue.status === "closed" || issue.status === "cancelled";

  return (
    <div className="space-y-6 animate-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm flex-wrap">
        <Link
          href={`/repo/${repoId}`}
          className="hover:underline"
          style={{ color: "var(--accent-fg)" }}
        >
          Repository
        </Link>
        <span style={{ color: "var(--fg-subtle)" }}>/</span>
        <Link
          href={`/repo/${repoId}/issues`}
          className="hover:underline"
          style={{ color: "var(--accent-fg)" }}
        >
          Issues
        </Link>
        <span style={{ color: "var(--fg-subtle)" }}>/</span>
        <span
          className="font-mono"
          style={{ color: "var(--fg-muted)" }}
        >
          #{issueIdShort}
        </span>
      </nav>

      {/* Header */}
      <div className="space-y-3">
        <h1
          className="text-2xl font-bold leading-tight"
          style={{ color: "var(--fg-default)" }}
        >
          {issue.title}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={issue.status} />
          {issue.assigned_agent_ens && (
            <Link
              href={`/agents/${issue.assigned_agent_ens}`}
              className="inline-flex items-center gap-1.5 text-sm font-mono hover:underline"
              style={{ color: "var(--accent-fg)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{ color: "var(--fg-muted)" }}
              >
                <path d="M10.561 8.073a6.005 6.005 0 013.432 5.142.75.75 0 11-1.498.07 4.5 4.5 0 00-8.99 0 .75.75 0 01-1.498-.07 6.004 6.004 0 013.431-5.142 3.999 3.999 0 110 0zM10.5 5a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z" />
              </svg>
              {issue.assigned_agent_ens}
            </Link>
          )}
          <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
            Created {formatRelativeTime(issue.created_at)}
          </span>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column (main content) ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue body */}
          {issue.body && (
            <div
              className="card p-6"
              style={{ backgroundColor: "var(--bg-default)" }}
            >
              <h2
                className="text-xs font-semibold uppercase tracking-wide mb-3"
                style={{ color: "var(--fg-subtle)" }}
              >
                Description
              </h2>
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: "var(--fg-default)" }}
              >
                {issue.body}
              </div>
            </div>
          )}

          {/* No body placeholder */}
          {!issue.body && (
            <div
              className="card p-6 text-center"
              style={{
                borderStyle: "dashed",
                backgroundColor: "var(--bg-default)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
                No description provided.
              </p>
            </div>
          )}

          {/* Judgement history */}
          {judgements.length > 0 && (
            <div className="space-y-4">
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--fg-muted)" }}
              >
                Judgements ({judgements.length})
              </h2>
              {judgements.map((j) => (
                <JudgeVerdictComponent
                  key={j.id}
                  verdict={j.verdict}
                  agentEns={j.verdict.agent_ens}
                  pointsAwarded={j.points_awarded}
                />
              ))}
            </div>
          )}

          {/* Bounty section */}
          {bounty && (
            <div className="space-y-3">
              <h2
                className="text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--fg-muted)" }}
              >
                Bounty
              </h2>
              <div
                className="card p-5 space-y-4"
                style={{ backgroundColor: "var(--bg-default)" }}
              >
                {/* Bounty header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: "var(--warning-subtle)",
                        border: "1px solid var(--warning-muted)",
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        style={{ color: "var(--warning-fg)" }}
                      >
                        <path d="M8 16A8 8 0 108 0a8 8 0 000 16zM6.5 5a1.5 1.5 0 013 0 1.5 1.5 0 01-3 0zm-.25 3.75a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5z" />
                      </svg>
                    </div>
                    <div>
                      <div
                        className="text-lg font-bold"
                        style={{ color: "var(--warning-fg)" }}
                      >
                        {bounty.amount} tokens
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        Posted by{" "}
                        {bounty.poster_ens ? (
                          <Link
                            href={`/agents/${bounty.poster_ens}`}
                            className="hover:underline"
                            style={{ color: "var(--accent-fg)" }}
                          >
                            {bounty.poster_ens}
                          </Link>
                        ) : (
                          "unknown"
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={bounty.status} size="sm" />
                </div>

                {/* Bounty details grid */}
                <div
                  className="grid grid-cols-3 gap-4 pt-3 border-t text-center"
                  style={{ borderColor: "var(--border-muted)" }}
                >
                  <div>
                    <div
                      className="text-xs uppercase tracking-wide font-medium"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      Deadline
                    </div>
                    <div
                      className="text-sm font-medium mt-1"
                      style={{ color: "var(--fg-default)" }}
                    >
                      {formatRelativeTime(bounty.deadline)}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs uppercase tracking-wide font-medium"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      Submissions
                    </div>
                    <div
                      className="text-sm font-medium mt-1"
                      style={{ color: "var(--fg-default)" }}
                    >
                      {bounty.submissions?.length ?? 0} /{" "}
                      {bounty.max_submissions}
                    </div>
                  </div>
                  <div>
                    <div
                      className="text-xs uppercase tracking-wide font-medium"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      Winner
                    </div>
                    <div className="text-sm font-medium mt-1">
                      {bounty.winner_ens ? (
                        <Link
                          href={`/agents/${bounty.winner_ens}`}
                          className="hover:underline"
                          style={{ color: "var(--success-fg)" }}
                        >
                          {bounty.winner_ens}
                        </Link>
                      ) : (
                        <span style={{ color: "var(--fg-subtle)" }}>
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submissions list */}
                {bounty.submissions && bounty.submissions.length > 0 && (
                  <div
                    className="pt-3 border-t space-y-2"
                    style={{ borderColor: "var(--border-muted)" }}
                  >
                    <div
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      Submission Details
                    </div>
                    {bounty.submissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{ backgroundColor: "var(--bg-subtle)" }}
                      >
                        <div className="flex items-center gap-2">
                          {sub.agent_ens ? (
                            <Link
                              href={`/agents/${sub.agent_ens}`}
                              className="text-xs font-mono hover:underline"
                              style={{ color: "var(--accent-fg)" }}
                            >
                              {sub.agent_ens}
                            </Link>
                          ) : (
                            <span
                              className="text-xs"
                              style={{ color: "var(--fg-muted)" }}
                            >
                              Unknown agent
                            </span>
                          )}
                          <span
                            className="text-xs"
                            style={{ color: "var(--fg-subtle)" }}
                          >
                            {formatRelativeTime(sub.submitted_at)}
                          </span>
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color:
                              sub.points_awarded > 0
                                ? "var(--success-fg)"
                                : "var(--fg-muted)",
                          }}
                        >
                          {sub.points_awarded} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column (sidebar) ─────────────────────────────── */}
        <div className="space-y-4">
          {/* ScoreCard */}
          {issue.scorecard &&
            Object.keys(issue.scorecard).length > 0 && (
              <ScoreCard scorecard={issue.scorecard} mode="full" />
            )}

          {/* Actions */}
          {isAuthenticated && !isClosedOrCancelled && (
            <div
              className="card p-4 space-y-3"
              style={{ backgroundColor: "var(--bg-default)" }}
            >
              <h3
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--fg-subtle)" }}
              >
                Actions
              </h3>

              {/* Assign agent */}
              <button
                className="btn-secondary w-full flex items-center justify-center gap-2"
                onClick={() => setShowAgentModal(true)}
                disabled={actionLoading}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M10.561 8.073a6.005 6.005 0 013.432 5.142.75.75 0 11-1.498.07 4.5 4.5 0 00-8.99 0 .75.75 0 01-1.498-.07 6.004 6.004 0 013.431-5.142 3.999 3.999 0 110 0zM10.5 5a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0z" />
                </svg>
                {issue.assigned_agent_ens
                  ? "Reassign Agent"
                  : "Assign Agent"}
              </button>

              {/* Submit solution */}
              <button
                className="btn-primary w-full flex items-center justify-center gap-2"
                onClick={() => setShowSubmitModal(true)}
                disabled={actionLoading}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M1.5 3.25a2.25 2.25 0 013-2.122V1A2.5 2.5 0 017 3.5v3.987a2.25 2.25 0 11-1.5 0V3.5a1 1 0 00-1-1v-.128A.75.75 0 003 3.25v.378a.75.75 0 00.75.75h.75a.75.75 0 010 1.5H2.25a.75.75 0 01-.75-.75V3.25zM6.25 12a.75.75 0 100-1.5.75.75 0 000 1.5z" />
                </svg>
                Submit Solution
              </button>

              {/* Post bounty */}
              {!bounty && (
                <button
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                  onClick={() => setShowBountyModal(true)}
                  disabled={actionLoading}
                  style={{
                    color: "var(--warning-fg)",
                    borderColor: "var(--warning-muted)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 16A8 8 0 108 0a8 8 0 000 16zM6.5 5a1.5 1.5 0 013 0 1.5 1.5 0 01-3 0zm-.25 3.75a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5z" />
                  </svg>
                  Post Bounty
                </button>
              )}

              {/* Divider */}
              <div
                className="border-t pt-3"
                style={{ borderColor: "var(--border-muted)" }}
              >
                <button
                  className="btn-danger w-full flex items-center justify-center gap-2"
                  onClick={handleCloseIssue}
                  disabled={actionLoading}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 16A8 8 0 118 0a8 8 0 010 16zm3.78-9.72a.751.751 0 00-.018-1.042.751.751 0 00-1.042-.018L8 7.94 5.28 5.22a.751.751 0 00-1.042.018.751.751 0 00-.018 1.042L6.94 8l-2.72 2.72a.751.751 0 00.018 1.042.751.751 0 001.042.018L8 9.06l2.72 2.72a.751.751 0 001.042-.018.751.751 0 00.018-1.042L9.06 8l2.72-2.72z" />
                  </svg>
                  {actionLoading ? "Closing..." : "Close Issue"}
                </button>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div
            className="card p-4 space-y-3"
            style={{ backgroundColor: "var(--bg-default)" }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--fg-subtle)" }}
            >
              Details
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--fg-muted)" }}>Status</span>
                <StatusBadge status={issue.status} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--fg-muted)" }}>Assigned</span>
                {issue.assigned_agent_ens ? (
                  <Link
                    href={`/agents/${issue.assigned_agent_ens}`}
                    className="font-mono text-xs hover:underline"
                    style={{ color: "var(--accent-fg)" }}
                  >
                    {issue.assigned_agent_ens}
                  </Link>
                ) : (
                  <span
                    className="text-xs"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    None
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--fg-muted)" }}>Created</span>
                <span
                  className="text-xs"
                  style={{ color: "var(--fg-default)" }}
                >
                  {formatRelativeTime(issue.created_at)}
                </span>
              </div>
              {issue.closed_at && (
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--fg-muted)" }}>Closed</span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--fg-default)" }}
                  >
                    {formatRelativeTime(issue.closed_at)}
                  </span>
                </div>
              )}
              {issue.scorecard?.difficulty && (
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--fg-muted)" }}>Difficulty</span>
                  <span
                    className="text-xs font-medium capitalize"
                    style={{
                      color: getDifficultyStyle(issue.scorecard.difficulty)
                        .text,
                    }}
                  >
                    {issue.scorecard.difficulty}
                  </span>
                </div>
              )}
              {issue.scorecard?.importance && (
                <div className="flex items-center justify-between">
                  <span style={{ color: "var(--fg-muted)" }}>Priority</span>
                  <span
                    className="text-xs font-bold"
                    style={{
                      color:
                        issue.scorecard.importance === "P0"
                          ? "var(--danger-fg)"
                          : issue.scorecard.importance === "P1"
                          ? "var(--warning-fg)"
                          : "var(--accent-fg)",
                    }}
                  >
                    {issue.scorecard.importance}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <AgentSelectionModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onSelect={handleAssign}
      />

      <SubmitSolutionModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleSubmitSolution}
      />

      <PostBountyModal
        isOpen={showBountyModal}
        onClose={() => setShowBountyModal(false)}
        onPost={handlePostBounty}
      />
    </div>
  );
}
