"use client";

import { useState } from "react";
import Link from "next/link";
import type { Commit } from "@/lib/api";
import { formatRelativeTime, getReasoningTypeStyle } from "@/lib/utils";

interface CommitCardProps {
  commit: Commit;
  showExpanded?: boolean;
}

export function CommitCard({ commit, showExpanded = false }: CommitCardProps) {
  const [expanded, setExpanded] = useState(showExpanded);
  const reasoningStyle = commit.reasoning_type
    ? getReasoningTypeStyle(commit.reasoning_type)
    : null;

  const hasTraceData =
    commit.trace_prompt ||
    commit.trace_result ||
    (commit.trace_tools && commit.trace_tools.length > 0) ||
    (commit.trace_context &&
      Object.keys(commit.trace_context).length > 0);

  const hasKnowledge = commit.knowledge_context &&
    (commit.knowledge_context.decisions?.length ||
     commit.knowledge_context.architecture ||
     commit.knowledge_context.libraries?.length ||
     commit.knowledge_context.open_questions?.length ||
     commit.knowledge_context.next_steps?.length ||
     commit.knowledge_context.handoff_summary);

  return (
    <div className="card card-hover p-4 animate-in">
      {/* Top row: commit message + time */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Commit icon */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="shrink-0"
              style={{ color: "var(--fg-subtle)" }}
            >
              <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zM8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            </svg>
            <h3
              className="text-sm font-semibold truncate"
              style={{ color: "var(--fg-default)" }}
            >
              {commit.message}
            </h3>
          </div>

          {/* Author + branch */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {commit.author_ens && (
              <Link
                href={`/agents/${commit.author_ens}`}
                className="text-xs font-medium transition-colors"
                style={{ color: "var(--accent-fg)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = "none";
                }}
              >
                {commit.author_ens}
              </Link>
            )}
            {commit.branch_name && (
              <>
                <span style={{ color: "var(--fg-subtle)" }}>on</span>
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: "var(--accent-subtle)",
                    color: "var(--accent-fg)",
                  }}
                >
                  {commit.branch_name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right side: time + reasoning badge */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className="text-xs whitespace-nowrap"
            style={{ color: "var(--fg-subtle)" }}
          >
            {formatRelativeTime(commit.created_at)}
          </span>
          {reasoningStyle && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: reasoningStyle.bg,
                color: reasoningStyle.text,
                border: `1px solid ${reasoningStyle.border}`,
              }}
            >
              {reasoningStyle.label}
            </span>
          )}
        </div>
      </div>

      {/* Semantic summary */}
      {commit.semantic_summary && (
        <p
          className="text-sm mt-2.5 leading-relaxed"
          style={{ color: "var(--fg-muted)" }}
        >
          {commit.semantic_summary}
        </p>
      )}

      {/* Tags */}
      {commit.tags && commit.tags.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          {commit.tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: "var(--bg-subtle)",
                color: "var(--fg-muted)",
                border: "1px solid var(--border-muted)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Knowledge Context */}
      {hasKnowledge && commit.knowledge_context && (
        <div
          className="mt-3 pt-3 border-t"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              style={{ color: "var(--success-fg)" }}
            >
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z" />
            </svg>
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--success-fg)" }}
            >
              Knowledge Context
            </span>
          </div>

          {/* Handoff summary */}
          {commit.knowledge_context.handoff_summary && (
            <p
              className="text-xs leading-relaxed mb-2 p-2 rounded"
              style={{
                backgroundColor: "var(--success-subtle)",
                color: "var(--fg-default)",
                border: "1px solid var(--success-muted)",
              }}
            >
              {commit.knowledge_context.handoff_summary}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Decisions */}
            {commit.knowledge_context.decisions && commit.knowledge_context.decisions.length > 0 && (
              <div className="space-y-1">
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  Decisions
                </div>
                <ul className="space-y-0.5">
                  {commit.knowledge_context.decisions.map((d, i) => (
                    <li
                      key={i}
                      className="text-xs leading-relaxed pl-3 relative"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      <span className="absolute left-0" style={{ color: "var(--accent-fg)" }}>-</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Libraries */}
            {commit.knowledge_context.libraries && commit.knowledge_context.libraries.length > 0 && (
              <div className="space-y-1">
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  Libraries
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {commit.knowledge_context.libraries.map((lib, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono"
                      style={{
                        backgroundColor: "var(--accent-subtle)",
                        color: "var(--accent-fg)",
                        border: "1px solid var(--accent-muted)",
                        fontSize: "10px",
                      }}
                    >
                      {lib}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {commit.knowledge_context.next_steps && commit.knowledge_context.next_steps.length > 0 && (
              <div className="space-y-1">
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  Next Steps
                </div>
                <ul className="space-y-0.5">
                  {commit.knowledge_context.next_steps.map((s, i) => (
                    <li
                      key={i}
                      className="text-xs leading-relaxed pl-3 relative"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      <span className="absolute left-0" style={{ color: "var(--warning-fg)" }}>-</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Open Questions */}
            {commit.knowledge_context.open_questions && commit.knowledge_context.open_questions.length > 0 && (
              <div className="space-y-1">
                <div
                  className="text-xs font-medium"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  Open Questions
                </div>
                <ul className="space-y-0.5">
                  {commit.knowledge_context.open_questions.map((q, i) => (
                    <li
                      key={i}
                      className="text-xs leading-relaxed pl-3 relative"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      <span className="absolute left-0" style={{ color: "var(--danger-fg)" }}>?</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Architecture */}
          {commit.knowledge_context.architecture && (
            <div className="mt-2 space-y-1">
              <div
                className="text-xs font-medium"
                style={{ color: "var(--fg-subtle)" }}
              >
                Architecture
              </div>
              <div
                className="text-xs font-mono p-2 rounded overflow-x-auto leading-relaxed"
                style={{
                  backgroundColor: "var(--bg-inset)",
                  color: "var(--fg-muted)",
                  border: "1px solid var(--border-muted)",
                }}
              >
                {commit.knowledge_context.architecture}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trace data expandable section */}
      {hasTraceData && (
        <div
          className="mt-3 pt-3 border-t"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors w-full"
            style={{ color: "var(--fg-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--fg-default)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--fg-muted)";
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="transition-transform duration-200"
              style={{
                transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" />
            </svg>
            <span>Trace Data</span>
            {commit.trace_tools && commit.trace_tools.length > 0 && (
              <span
                className="px-1.5 rounded-full text-xs"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  color: "var(--fg-subtle)",
                }}
              >
                {commit.trace_tools.length} tool
                {commit.trace_tools.length !== 1 ? "s" : ""}
              </span>
            )}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 animate-in">
              {/* Prompt */}
              {commit.trace_prompt && (
                <div className="space-y-1">
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    Prompt
                  </div>
                  <div
                    className="text-xs font-mono p-3 rounded overflow-x-auto leading-relaxed"
                    style={{
                      backgroundColor: "var(--bg-inset)",
                      color: "var(--fg-muted)",
                      border: "1px solid var(--border-muted)",
                    }}
                  >
                    {commit.trace_prompt}
                  </div>
                </div>
              )}

              {/* Tools used */}
              {commit.trace_tools && commit.trace_tools.length > 0 && (
                <div className="space-y-1">
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    Tools Used
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {commit.trace_tools.map((tool, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono"
                        style={{
                          backgroundColor: "var(--accent-subtle)",
                          color: "var(--accent-fg)",
                          border: "1px solid var(--accent-muted)",
                        }}
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Context */}
              {commit.trace_context &&
                Object.keys(commit.trace_context).length > 0 && (
                  <div className="space-y-1">
                    <div
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      Context
                    </div>
                    <pre
                      className="text-xs font-mono p-3 rounded overflow-x-auto leading-relaxed"
                      style={{
                        backgroundColor: "var(--bg-inset)",
                        color: "var(--fg-muted)",
                        border: "1px solid var(--border-muted)",
                      }}
                    >
                      {JSON.stringify(commit.trace_context, null, 2)}
                    </pre>
                  </div>
                )}

              {/* Result */}
              {commit.trace_result && (
                <div className="space-y-1">
                  <div
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    Result
                  </div>
                  <div
                    className="text-xs font-mono p-3 rounded overflow-x-auto leading-relaxed"
                    style={{
                      backgroundColor: "var(--bg-inset)",
                      color: "var(--fg-muted)",
                      border: "1px solid var(--border-muted)",
                    }}
                  >
                    {commit.trace_result}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
