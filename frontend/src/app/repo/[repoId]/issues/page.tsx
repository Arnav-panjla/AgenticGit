"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { issueApi, type Issue, type Scorecard } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDifficultyStyle,
  formatRelativeTime,
} from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { RepoSectionHeader } from "@/components/RepoSectionHeader";

// ── Column configuration ──────────────────────────────────────

interface KanbanColumn {
  key: string;
  label: string;
  statuses: string[];
  accentColor: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    key: "open",
    label: "Open",
    statuses: ["open"],
    accentColor: "var(--success-fg)",
  },
  {
    key: "in_progress",
    label: "In Progress",
    statuses: ["in_progress"],
    accentColor: "var(--warning-fg)",
  },
  {
    key: "done",
    label: "Closed / Cancelled",
    statuses: ["closed", "cancelled"],
    accentColor: "var(--purple-fg)",
  },
];

// ── Sortable issue card ───────────────────────────────────────

function SortableIssueCard({
  issue,
  repoId,
}: {
  issue: Issue;
  repoId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const difficulty = issue.scorecard?.difficulty;
  const diffStyle = difficulty ? getDifficultyStyle(difficulty) : null;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link
        href={`/repo/${repoId}/issues/${issue.id}`}
        className="card card-hover block p-4 space-y-3 transition-all duration-200 cursor-pointer"
        style={{ textDecoration: "none" }}
        onClick={(e) => {
          // Allow drag without triggering navigation
          if (isDragging) e.preventDefault();
        }}
      >
        {/* Title */}
        <h3
          className="text-sm font-semibold leading-snug line-clamp-2"
          style={{ color: "var(--fg-default)" }}
        >
          {issue.title}
        </h3>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          {diffStyle && difficulty && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize"
              style={{
                backgroundColor: diffStyle.bg,
                color: diffStyle.text,
                border: `1px solid ${diffStyle.border}`,
              }}
            >
              {difficulty}
            </span>
          )}
          {issue.scorecard?.base_points != null && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{
                backgroundColor: "var(--accent-subtle)",
                color: "var(--accent-fg)",
                border: "1px solid var(--accent-muted)",
              }}
            >
              {issue.scorecard.base_points} pts
            </span>
          )}
          {issue.scorecard?.importance && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold"
              style={{
                backgroundColor:
                  issue.scorecard.importance === "P0"
                    ? "var(--danger-subtle)"
                    : issue.scorecard.importance === "P1"
                    ? "var(--warning-subtle)"
                    : "var(--accent-subtle)",
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
          )}
        </div>

        {/* Footer: agent + time */}
        <div
          className="flex items-center justify-between text-[11px] pt-2 border-t"
          style={{
            borderColor: "var(--border-muted)",
            color: "var(--fg-subtle)",
          }}
        >
          {issue.assigned_agent_ens ? (
            <span
              className="font-mono truncate"
              style={{ color: "var(--accent-fg)" }}
            >
              {issue.assigned_agent_ens}
            </span>
          ) : (
            <span>Unassigned</span>
          )}
          <span className="shrink-0 ml-2">
            {formatRelativeTime(issue.created_at)}
          </span>
        </div>
      </Link>
    </div>
  );
}

// ── Create Issue Modal ────────────────────────────────────────

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (issue: Issue) => void;
  repoId: string;
}

function CreateIssueModal({
  isOpen,
  onClose,
  onCreated,
  repoId,
}: CreateIssueModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [basePoints, setBasePoints] = useState<string>("");
  const [requiredLanguage, setRequiredLanguage] = useState("");
  const [timeLimitHours, setTimeLimitHours] = useState<string>("");
  const [importance, setImportance] = useState<string>("");
  const [unitTests, setUnitTests] = useState<{ name: string; points: string }[]>([]);
  const [bonusCriteria, setBonusCriteria] = useState<string[]>([]);
  const [bonusPointsPerCriterion, setBonusPointsPerCriterion] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setBody("");
    setDifficulty("");
    setBasePoints("");
    setRequiredLanguage("");
    setTimeLimitHours("");
    setImportance("");
    setUnitTests([]);
    setBonusCriteria([]);
    setBonusPointsPerCriterion("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    setError(null);

    const scorecard: Scorecard = {};
    if (difficulty) scorecard.difficulty = difficulty as Scorecard["difficulty"];
    if (basePoints) scorecard.base_points = Number(basePoints);
    if (requiredLanguage) scorecard.required_language = requiredLanguage;
    if (timeLimitHours) scorecard.time_limit_hours = Number(timeLimitHours);
    if (importance) scorecard.importance = importance as Scorecard["importance"];
    if (unitTests.length > 0) {
      scorecard.unit_tests = unitTests
        .filter((t) => t.name.trim())
        .map((t) => ({ name: t.name.trim(), points: Number(t.points) || 0 }));
    }
    if (bonusCriteria.length > 0) {
      scorecard.bonus_criteria = bonusCriteria.filter((c) => c.trim());
    }
    if (bonusPointsPerCriterion) {
      scorecard.bonus_points_per_criterion = Number(bonusPointsPerCriterion);
    }

    const hasScorecard = Object.keys(scorecard).length > 0;

    try {
      const created = await issueApi.create(repoId, {
        title: title.trim(),
        body: body.trim() || undefined,
        scorecard: hasScorecard ? scorecard : undefined,
      });
      onCreated(created);
      reset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create issue");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between pb-4 mb-4 border-b"
          style={{ borderColor: "var(--border-default)" }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--fg-default)" }}
          >
            Create New Issue
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
          {/* Title */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--fg-default)" }}
            >
              Title <span style={{ color: "var(--danger-fg)" }}>*</span>
            </label>
            <input
              className="input w-full"
              placeholder="Issue title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Body */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--fg-default)" }}
            >
              Description
            </label>
            <textarea
              className="input w-full min-h-[120px] resize-y"
              placeholder="Describe the issue..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          {/* Scorecard section */}
          <div
            className="pt-4 border-t"
            style={{ borderColor: "var(--border-muted)" }}
          >
            <h3
              className="text-sm font-semibold mb-3 uppercase tracking-wide"
              style={{ color: "var(--fg-muted)" }}
            >
              Scorecard
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Difficulty */}
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Difficulty
                </label>
                <select
                  className="input w-full"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              {/* Base Points */}
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Base Points
                </label>
                <input
                  className="input w-full"
                  type="number"
                  min="0"
                  placeholder="100"
                  value={basePoints}
                  onChange={(e) => setBasePoints(e.target.value)}
                />
              </div>

              {/* Importance */}
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Priority
                </label>
                <select
                  className="input w-full"
                  value={importance}
                  onChange={(e) => setImportance(e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="P0">P0 - Critical</option>
                  <option value="P1">P1 - High</option>
                  <option value="P2">P2 - Medium</option>
                  <option value="P3">P3 - Low</option>
                  <option value="P4">P4 - Trivial</option>
                </select>
              </div>

              {/* Required Language */}
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Required Language
                </label>
                <input
                  className="input w-full"
                  placeholder="e.g. TypeScript"
                  value={requiredLanguage}
                  onChange={(e) => setRequiredLanguage(e.target.value)}
                />
              </div>

              {/* Time Limit */}
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Time Limit (hours)
                </label>
                <input
                  className="input w-full"
                  type="number"
                  min="0"
                  placeholder="24"
                  value={timeLimitHours}
                  onChange={(e) => setTimeLimitHours(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Unit Tests */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--fg-muted)" }}
              >
                Unit Tests
              </label>
              <button
                type="button"
                className="text-xs font-medium px-2 py-1 rounded hover:bg-[var(--bg-subtle)] transition-colors"
                style={{ color: "var(--accent-fg)" }}
                onClick={() =>
                  setUnitTests([...unitTests, { name: "", points: "" }])
                }
              >
                + Add Test
              </button>
            </div>
            {unitTests.map((test, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  className="input flex-1"
                  placeholder="Test name"
                  value={test.name}
                  onChange={(e) => {
                    const updated = [...unitTests];
                    updated[i] = { ...updated[i], name: e.target.value };
                    setUnitTests(updated);
                  }}
                />
                <input
                  className="input w-20"
                  type="number"
                  min="0"
                  placeholder="pts"
                  value={test.points}
                  onChange={(e) => {
                    const updated = [...unitTests];
                    updated[i] = { ...updated[i], points: e.target.value };
                    setUnitTests(updated);
                  }}
                />
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-[var(--bg-subtle)] transition-colors"
                  style={{ color: "var(--danger-fg)" }}
                  onClick={() =>
                    setUnitTests(unitTests.filter((_, j) => j !== i))
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Bonus Criteria */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="text-xs font-medium uppercase tracking-wide"
                style={{ color: "var(--fg-muted)" }}
              >
                Bonus Criteria
              </label>
              <button
                type="button"
                className="text-xs font-medium px-2 py-1 rounded hover:bg-[var(--bg-subtle)] transition-colors"
                style={{ color: "var(--accent-fg)" }}
                onClick={() => setBonusCriteria([...bonusCriteria, ""])}
              >
                + Add Criterion
              </button>
            </div>
            {bonusCriteria.length > 0 && (
              <div className="mb-2">
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Points per criterion
                </label>
                <input
                  className="input w-24"
                  type="number"
                  min="0"
                  placeholder="10"
                  value={bonusPointsPerCriterion}
                  onChange={(e) => setBonusPointsPerCriterion(e.target.value)}
                />
              </div>
            )}
            {bonusCriteria.map((criterion, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  className="input flex-1"
                  placeholder="Bonus criterion"
                  value={criterion}
                  onChange={(e) => {
                    const updated = [...bonusCriteria];
                    updated[i] = e.target.value;
                    setBonusCriteria(updated);
                  }}
                />
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-[var(--bg-subtle)] transition-colors"
                  style={{ color: "var(--danger-fg)" }}
                  onClick={() =>
                    setBonusCriteria(bonusCriteria.filter((_, j) => j !== i))
                  }
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
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
            disabled={submitting || !title.trim()}
          >
            {submitting ? "Creating..." : "Create Issue"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function IssueBoardPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params.repoId as string;
  const { isAuthenticated } = useAuth();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchIssues = useCallback(() => {
    setLoading(true);
    issueApi
      .list(repoId)
      .then(setIssues)
      .catch((err) => setError(err.message ?? "Failed to load issues"))
      .finally(() => setLoading(false));
  }, [repoId]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Group issues by column
  const columnIssues = (col: KanbanColumn) =>
    issues.filter((i) => col.statuses.includes(i.status));

  // Handle drag and drop between columns
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const draggedIssue = issues.find((i) => i.id === active.id);
    if (!draggedIssue) return;

    // Find which column the item was dropped on (by finding which column the "over" item belongs to)
    const overIssue = issues.find((i) => i.id === over.id);
    if (!overIssue) return;

    const sourceColumn = COLUMNS.find((col) =>
      col.statuses.includes(draggedIssue.status)
    );
    const targetColumn = COLUMNS.find((col) =>
      col.statuses.includes(overIssue.status)
    );

    if (!sourceColumn || !targetColumn || sourceColumn.key === targetColumn.key)
      return;

    // Determine the new status based on the target column
    const newStatus = targetColumn.statuses[0] as Issue["status"];

    // Optimistic update
    setIssues((prev) =>
      prev.map((i) =>
        i.id === draggedIssue.id ? { ...i, status: newStatus } : i
      )
    );

    try {
      await issueApi.update(repoId, draggedIssue.id, { status: newStatus });
    } catch {
      // Revert on error
      setIssues((prev) =>
        prev.map((i) =>
          i.id === draggedIssue.id
            ? { ...i, status: draggedIssue.status }
            : i
        )
      );
    }
  };

  const handleIssueCreated = (issue: Issue) => {
    setIssues((prev) => [issue, ...prev]);
  };

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-8 w-48" />
          </div>
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>

        {/* Columns skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, colIdx) => (
            <div key={colIdx} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-5 w-8 rounded-full" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: colIdx === 0 ? 3 : 2 }).map((_, i) => (
                  <div key={i} className="card p-4 space-y-3">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="flex gap-2">
                      <div className="skeleton h-5 w-14 rounded-full" />
                      <div className="skeleton h-5 w-12 rounded-full" />
                    </div>
                    <div className="flex justify-between pt-2">
                      <div className="skeleton h-3 w-20" />
                      <div className="skeleton h-3 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────
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
              Failed to load issues
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main content ──────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in">
      <RepoSectionHeader
        repoId={repoId}
        section="issues"
        title="Issues"
        titleIcon={
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
          </svg>
        }
        subtitle="Organize and prioritize tasks for agents"
        countLabel={`${issues.length} total`}
        rightContent={
          isAuthenticated ? (
            <button
              className="btn-primary flex items-center gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z" />
              </svg>
              New Issue
            </button>
          ) : null
        }
      />

      {/* Empty state */}
      {issues.length === 0 && (
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
            <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
          </svg>
          <p
            className="text-lg font-medium"
            style={{ color: "var(--fg-muted)" }}
          >
            No issues yet
          </p>
          <p className="text-sm" style={{ color: "var(--fg-subtle)" }}>
            Create one to get started.
          </p>
          {isAuthenticated && (
            <button
              className="btn-primary mt-2"
              onClick={() => setShowCreateModal(true)}
            >
              Create First Issue
            </button>
          )}
        </div>
      )}

      {/* Kanban Board */}
      {issues.length > 0 && (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {COLUMNS.map((col) => {
              const colItems = columnIssues(col);
              return (
                <div key={col.key} className="space-y-3">
                  {/* Column header */}
                  <div
                    className="flex items-center justify-between pb-3 border-b"
                    style={{ borderColor: col.accentColor }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: col.accentColor }}
                      />
                      <h2
                        className="text-sm font-semibold"
                        style={{ color: "var(--fg-default)" }}
                      >
                        {col.label}
                      </h2>
                    </div>
                    <span
                      className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: "var(--bg-subtle)",
                        color: "var(--fg-muted)",
                        border: "1px solid var(--border-muted)",
                      }}
                    >
                      {colItems.length}
                    </span>
                  </div>

                  {/* Column content */}
                  <SortableContext
                    items={colItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div
                      className="space-y-3 min-h-[120px] rounded-lg p-2"
                      style={{ backgroundColor: "var(--bg-inset)" }}
                    >
                      {colItems.length === 0 && (
                        <div
                          className="flex items-center justify-center h-24 rounded-lg border border-dashed text-xs"
                          style={{
                            borderColor: "var(--border-muted)",
                            color: "var(--fg-subtle)",
                          }}
                        >
                          No issues
                        </div>
                      )}
                      {colItems.map((issue) => (
                        <SortableIssueCard
                          key={issue.id}
                          issue={issue}
                          repoId={repoId}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>
        </DndContext>
      )}

      {/* Create Issue Modal */}
      <CreateIssueModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleIssueCreated}
        repoId={repoId}
      />
    </div>
  );
}
