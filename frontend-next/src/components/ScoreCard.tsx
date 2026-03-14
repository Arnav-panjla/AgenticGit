"use client";

import type { Scorecard } from "@/lib/api";
import { getDifficultyStyle } from "@/lib/utils";

interface ScoreCardProps {
  scorecard: Scorecard;
  mode?: "compact" | "full";
}

export function ScoreCard({ scorecard, mode = "compact" }: ScoreCardProps) {
  const difficulty = scorecard.difficulty ?? "medium";
  const diffStyle = getDifficultyStyle(difficulty);
  const totalPoints =
    (scorecard.base_points ?? 0) +
    (scorecard.bonus_criteria?.length ?? 0) *
      (scorecard.bonus_points_per_criterion ?? 0);

  if (mode === "compact") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{
          backgroundColor: diffStyle.bg,
          color: diffStyle.text,
          border: `1px solid ${diffStyle.border}`,
        }}
      >
        <span className="capitalize">{difficulty}</span>
        <span
          className="w-px h-3"
          style={{ backgroundColor: diffStyle.border }}
        />
        <span>{scorecard.base_points ?? 0} pts</span>
      </span>
    );
  }

  return (
    <div
      className="card p-4 space-y-4 animate-in"
      style={{ backgroundColor: "var(--bg-default)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--fg-muted)" }}
        >
          Scorecard
        </h3>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
          style={{
            backgroundColor: diffStyle.bg,
            color: diffStyle.text,
            border: `1px solid ${diffStyle.border}`,
          }}
        >
          {difficulty}
        </span>
      </div>

      {/* Points summary */}
      <div
        className="flex items-baseline gap-2 pb-3 border-b"
        style={{ borderColor: "var(--border-muted)" }}
      >
        <span
          className="text-2xl font-bold"
          style={{ color: "var(--fg-default)" }}
        >
          {scorecard.base_points ?? 0}
        </span>
        <span className="text-sm" style={{ color: "var(--fg-muted)" }}>
          base points
        </span>
        {totalPoints > (scorecard.base_points ?? 0) && (
          <>
            <span style={{ color: "var(--fg-subtle)" }}>/</span>
            <span
              className="text-lg font-semibold"
              style={{ color: "var(--success-fg)" }}
            >
              {totalPoints}
            </span>
            <span className="text-sm" style={{ color: "var(--fg-muted)" }}>
              max
            </span>
          </>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {scorecard.time_limit_hours != null && (
          <div className="space-y-1">
            <div
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--fg-subtle)" }}
            >
              Time Limit
            </div>
            <div
              className="flex items-center gap-1.5"
              style={{ color: "var(--fg-default)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{ color: "var(--warning-fg)" }}
              >
                <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm0 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 3a.75.75 0 01.75.75v3.69l2.28 2.28a.75.75 0 01-1.06 1.06l-2.5-2.5A.75.75 0 017.25 8V3.75A.75.75 0 018 3z" />
              </svg>
              <span>{scorecard.time_limit_hours}h</span>
            </div>
          </div>
        )}

        {scorecard.required_language && (
          <div className="space-y-1">
            <div
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--fg-subtle)" }}
            >
              Language
            </div>
            <div
              className="flex items-center gap-1.5"
              style={{ color: "var(--fg-default)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{ color: "var(--accent-fg)" }}
              >
                <path d="M1.5 1.75a.75.75 0 00-1.5 0v12.5a.75.75 0 001.5 0V1.75zm3.218 2.193a.75.75 0 011.06-.025l4 3.75a.75.75 0 010 1.094l-4 3.75a.75.75 0 01-1.035-1.084L8.196 8.25 4.743 4.968a.75.75 0 01-.025-1.025zM10.25 12a.75.75 0 000 1.5h4a.75.75 0 000-1.5h-4z" />
              </svg>
              <span>{scorecard.required_language}</span>
            </div>
          </div>
        )}

        {scorecard.importance && (
          <div className="space-y-1">
            <div
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--fg-subtle)" }}
            >
              Priority
            </div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
              style={{
                backgroundColor:
                  scorecard.importance === "P0"
                    ? "var(--danger-subtle)"
                    : scorecard.importance === "P1"
                    ? "var(--warning-subtle)"
                    : "var(--accent-subtle)",
                color:
                  scorecard.importance === "P0"
                    ? "var(--danger-fg)"
                    : scorecard.importance === "P1"
                    ? "var(--warning-fg)"
                    : "var(--accent-fg)",
              }}
            >
              {scorecard.importance}
            </span>
          </div>
        )}
      </div>

      {/* Unit tests */}
      {scorecard.unit_tests && scorecard.unit_tests.length > 0 && (
        <div className="space-y-2">
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--fg-subtle)" }}
          >
            Unit Tests ({scorecard.unit_tests.length})
          </div>
          <div className="space-y-1">
            {scorecard.unit_tests.map((test, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-1.5 rounded text-sm"
                style={{ backgroundColor: "var(--bg-subtle)" }}
              >
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--fg-default)" }}
                >
                  {test.name}
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--accent-fg)" }}
                >
                  {test.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bonus criteria */}
      {scorecard.bonus_criteria && scorecard.bonus_criteria.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--fg-subtle)" }}
            >
              Bonus Criteria
            </span>
            {scorecard.bonus_points_per_criterion != null && (
              <span
                className="text-xs"
                style={{ color: "var(--success-fg)" }}
              >
                +{scorecard.bonus_points_per_criterion} pts each
              </span>
            )}
          </div>
          <div className="space-y-1">
            {scorecard.bonus_criteria.map((criterion, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-1.5 rounded text-sm"
                style={{ backgroundColor: "var(--bg-subtle)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--success-fg)" }}
                >
                  <path d="M8 16A8 8 0 118 0a8 8 0 010 16zm3.78-9.72a.75.75 0 00-1.06-1.06L7.25 8.689 5.28 6.72a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l4-4z" />
                </svg>
                <span style={{ color: "var(--fg-default)" }}>
                  {criterion}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
