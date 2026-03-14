"use client";

import type { JudgeVerdict as JudgeVerdictType } from "@/lib/api";

interface JudgeVerdictProps {
  verdict: JudgeVerdictType;
  agentEns?: string;
  pointsAwarded?: number;
}

export function JudgeVerdict({
  verdict,
  agentEns,
  pointsAwarded,
}: JudgeVerdictProps) {
  const resolvedEns = agentEns ?? verdict.agent_ens;
  const resolvedPoints = pointsAwarded ?? verdict.points_awarded ?? 0;
  const passedTests = verdict.passed_tests ?? [];
  const failedTests = verdict.failed_tests ?? [];
  const bonusAchieved = verdict.bonus_achieved ?? [];
  const bonusMissed = verdict.bonus_missed ?? [];
  const totalTests = passedTests.length + failedTests.length;
  const passRate = totalTests > 0 ? (passedTests.length / totalTests) * 100 : 0;

  return (
    <div className="card p-5 space-y-5 animate-in">
      {/* Header: agent + points */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              backgroundColor: "var(--accent-subtle)",
              color: "var(--accent-fg)",
              border: "1px solid var(--accent-muted)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zM8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            </svg>
          </div>
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: "var(--fg-default)" }}
            >
              Judge Verdict
            </h3>
            {resolvedEns && (
              <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                for{" "}
                <span style={{ color: "var(--accent-fg)" }}>
                  {resolvedEns}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold"
            style={{
              color:
                resolvedPoints > 0
                  ? "var(--success-fg)"
                  : "var(--fg-muted)",
            }}
          >
            {resolvedPoints}
          </div>
          <div
            className="text-xs"
            style={{ color: "var(--fg-subtle)" }}
          >
            points awarded
          </div>
        </div>
      </div>

      {/* Test results */}
      {totalTests > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--fg-subtle)" }}
            >
              Tests ({passedTests.length}/{totalTests} passed)
            </span>
            <span
              className="text-xs font-medium"
              style={{
                color:
                  passRate === 100
                    ? "var(--success-fg)"
                    : passRate >= 50
                    ? "var(--warning-fg)"
                    : "var(--danger-fg)",
              }}
            >
              {Math.round(passRate)}%
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--bg-subtle)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${passRate}%`,
                backgroundColor:
                  passRate === 100
                    ? "var(--success-fg)"
                    : passRate >= 50
                    ? "var(--warning-fg)"
                    : "var(--danger-fg)",
              }}
            />
          </div>

          {/* Test list */}
          <div className="space-y-1 mt-2">
            {passedTests.map((test, i) => (
              <div
                key={`pass-${i}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                style={{ backgroundColor: "var(--bg-subtle)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="shrink-0"
                  style={{ color: "var(--success-fg)" }}
                >
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                </svg>
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--fg-default)" }}
                >
                  {test}
                </span>
              </div>
            ))}
            {failedTests.map((test, i) => (
              <div
                key={`fail-${i}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                style={{ backgroundColor: "var(--bg-subtle)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="shrink-0"
                  style={{ color: "var(--danger-fg)" }}
                >
                  <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                </svg>
                <span
                  className="font-mono text-xs"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {test}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bonus criteria */}
      {(bonusAchieved.length > 0 || bonusMissed.length > 0) && (
        <div
          className="space-y-2 pt-3 border-t"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--fg-subtle)" }}
          >
            Bonus Criteria
          </span>
          <div className="space-y-1">
            {bonusAchieved.map((criterion, i) => (
              <div
                key={`bonus-pass-${i}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                style={{ backgroundColor: "var(--success-subtle)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="shrink-0"
                  style={{ color: "var(--success-fg)" }}
                >
                  <path d="M8 16A8 8 0 118 0a8 8 0 010 16zm3.78-9.72a.75.75 0 00-1.06-1.06L7.25 8.689 5.28 6.72a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l4-4z" />
                </svg>
                <span style={{ color: "var(--success-fg)" }}>
                  {criterion}
                </span>
              </div>
            ))}
            {bonusMissed.map((criterion, i) => (
              <div
                key={`bonus-miss-${i}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                style={{ backgroundColor: "var(--bg-subtle)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="shrink-0"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  <path d="M8 0a8 8 0 110 16A8 8 0 018 0zM5.354 4.646a.5.5 0 00-.708.708L7.293 8l-2.647 2.646a.5.5 0 00.708.708L8 8.707l2.646 2.647a.5.5 0 00.708-.708L8.707 8l2.647-2.646a.5.5 0 00-.708-.708L8 7.293 5.354 4.646z" />
                </svg>
                <span style={{ color: "var(--fg-subtle)" }}>
                  {criterion}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code quality */}
      {verdict.code_quality != null && (
        <div
          className="space-y-2 pt-3 border-t"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--fg-subtle)" }}
            >
              Code Quality
            </span>
            <span
              className="text-sm font-bold"
              style={{
                color:
                  verdict.code_quality >= 80
                    ? "var(--success-fg)"
                    : verdict.code_quality >= 50
                    ? "var(--warning-fg)"
                    : "var(--danger-fg)",
              }}
            >
              {verdict.code_quality}/100
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--bg-subtle)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${verdict.code_quality}%`,
                background:
                  verdict.code_quality >= 80
                    ? "linear-gradient(90deg, var(--success-emphasis), var(--success-fg))"
                    : verdict.code_quality >= 50
                    ? "linear-gradient(90deg, var(--warning-emphasis), var(--warning-fg))"
                    : "linear-gradient(90deg, var(--danger-emphasis), var(--danger-fg))",
              }}
            />
          </div>
        </div>
      )}

      {/* Reasoning */}
      {verdict.reasoning && (
        <div
          className="space-y-2 pt-3 border-t"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--fg-subtle)" }}
          >
            Reasoning
          </span>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--fg-muted)" }}
          >
            {verdict.reasoning}
          </p>
        </div>
      )}

      {/* Suggestions */}
      {verdict.suggestions && verdict.suggestions.length > 0 && (
        <div
          className="space-y-2 pt-3 border-t"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "var(--fg-subtle)" }}
          >
            Suggestions
          </span>
          <ul className="space-y-1.5">
            {verdict.suggestions.map((suggestion, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm"
                style={{ color: "var(--fg-muted)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="mt-0.5 shrink-0"
                  style={{ color: "var(--accent-fg)" }}
                >
                  <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
