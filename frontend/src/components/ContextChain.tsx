"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ContextChain as ContextChainType } from "@/lib/api";
import { repoApi } from "@/lib/api";
import {
  formatRelativeTime,
  getReasoningTypeStyle,
  getRoleColor,
  stringToColor,
} from "@/lib/utils";

interface ContextChainProps {
  repoId: string;
  branch?: string;
}

export function ContextChain({ repoId, branch }: ContextChainProps) {
  const [chain, setChain] = useState<ContextChainType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    repoApi
      .contextChain(repoId, branch)
      .then((data) => {
        setChain(data);
        // Auto-expand latest segment
        if (data.handoffs.length > 0) {
          setExpandedSegments(new Set([data.handoffs.length - 1]));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [repoId, branch]);

  const toggleSegment = (index: number) => {
    setExpandedSegments((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-5 h-5 rounded"
            style={{ backgroundColor: "var(--bg-subtle)" }}
          />
          <div
            className="h-4 w-40 rounded"
            style={{ backgroundColor: "var(--bg-subtle)" }}
          />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded"
              style={{ backgroundColor: "var(--bg-subtle)" }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <p className="text-sm" style={{ color: "var(--danger-fg)" }}>
          Failed to load context chain: {error}
        </p>
      </div>
    );
  }

  if (!chain || chain.handoffs.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ color: "var(--fg-subtle)" }}
          >
            <path d="M1.5 1.75V13.5h13.75a.75.75 0 010 1.5H.75a.75.75 0 01-.75-.75V1.75a.75.75 0 011.5 0zm14.28 2.53l-5.25 5.25a.75.75 0 01-1.06 0L7 7.06 4.28 9.78a.75.75 0 01-1.06-1.06l3.25-3.25a.75.75 0 011.06 0L10 7.94l4.72-4.72a.75.75 0 111.06 1.06z" />
          </svg>
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--fg-default)" }}
          >
            Agent Context Chain
          </h3>
        </div>
        <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
          No commits yet. When agents start collaborating, their handoffs and
          knowledge flow will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ color: "var(--accent-fg)" }}
          >
            <path d="M1.5 1.75V13.5h13.75a.75.75 0 010 1.5H.75a.75.75 0 01-.75-.75V1.75a.75.75 0 011.5 0zm14.28 2.53l-5.25 5.25a.75.75 0 01-1.06 0L7 7.06 4.28 9.78a.75.75 0 01-1.06-1.06l3.25-3.25a.75.75 0 011.06 0L10 7.94l4.72-4.72a.75.75 0 111.06 1.06z" />
          </svg>
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--fg-default)" }}
          >
            Agent Context Chain
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--fg-subtle)" }}>
            {chain.total_agents} agent{chain.total_agents !== 1 ? "s" : ""},{" "}
            {chain.total_commits} commit{chain.total_commits !== 1 ? "s" : ""},{" "}
            {chain.handoffs.length} handoff
            {chain.handoffs.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical connector line */}
        <div
          className="absolute left-[15px] top-0 bottom-0 w-[2px]"
          style={{ backgroundColor: "var(--border-muted)" }}
        />

        <div className="space-y-1">
          {chain.handoffs.map((segment, segIdx) => {
            const isExpanded = expandedSegments.has(segIdx);
            const roleColor = segment.agent.role
              ? getRoleColor(segment.agent.role)
              : null;
            const agentColor = stringToColor(segment.agent.ens_name);
            const isLastSegment = segIdx === chain.handoffs.length - 1;

            return (
              <div key={segIdx} className="relative">
                {/* Handoff arrow between segments */}
                {segIdx > 0 && (
                  <div className="flex items-center gap-2 py-1.5 pl-[9px]">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      <path d="M8.22 2.97a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06l2.97-2.97H3.75a.75.75 0 010-1.5h7.44L8.22 4.03a.75.75 0 010-1.06z" />
                    </svg>
                    <span
                      className="text-xs font-medium"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      handoff
                    </span>
                  </div>
                )}

                {/* Agent segment */}
                <div className="flex items-start gap-3">
                  {/* Agent dot on timeline */}
                  <div
                    className="relative z-10 w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{
                      backgroundColor: agentColor,
                      color: "#fff",
                      border: isLastSegment
                        ? "2px solid var(--accent-fg)"
                        : "2px solid var(--border-muted)",
                    }}
                  >
                    {segment.agent.ens_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Segment card */}
                  <div className="flex-1 min-w-0 pb-2">
                    <button
                      onClick={() => toggleSegment(segIdx)}
                      className="w-full text-left rounded-lg p-3 transition-colors"
                      style={{
                        backgroundColor: isExpanded
                          ? "var(--bg-subtle)"
                          : "transparent",
                        border: isExpanded
                          ? "1px solid var(--border-default)"
                          : "1px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isExpanded) {
                          e.currentTarget.style.backgroundColor =
                            "var(--bg-subtle)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {/* Agent header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/agents/${segment.agent.ens_name}`}
                            className="text-sm font-semibold transition-colors"
                            style={{ color: "var(--accent-fg)" }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = "underline";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = "none";
                            }}
                          >
                            {segment.agent.ens_name}
                          </Link>
                          {roleColor && segment.agent.role && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: roleColor.bg,
                                color: roleColor.text,
                                border: `1px solid ${roleColor.border}`,
                              }}
                            >
                              {segment.agent.role}
                            </span>
                          )}
                          <span
                            className="text-xs"
                            style={{ color: "var(--fg-subtle)" }}
                          >
                            {segment.commits.length} commit
                            {segment.commits.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <svg
                          width="12"
                          height="12"
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
                          <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" />
                        </svg>
                      </div>

                      {/* Contribution summary (always visible) */}
                      {segment.contribution_summary && (
                        <p
                          className="text-xs mt-1.5 leading-relaxed"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {segment.contribution_summary}
                        </p>
                      )}

                      {/* Expanded commit details */}
                      {isExpanded && (
                        <div className="mt-3 space-y-2 animate-in">
                          {segment.commits.map((commit) => {
                            const reasoningStyle = commit.reasoning_type
                              ? getReasoningTypeStyle(commit.reasoning_type)
                              : null;
                            return (
                              <div
                                key={commit.id}
                                className="rounded p-2.5"
                                style={{
                                  backgroundColor: "var(--bg-default)",
                                  border: "1px solid var(--border-muted)",
                                }}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 16 16"
                                      fill="currentColor"
                                      className="shrink-0"
                                      style={{ color: "var(--fg-subtle)" }}
                                    >
                                      <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zM8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                                    </svg>
                                    <span
                                      className="text-xs font-medium truncate"
                                      style={{ color: "var(--fg-default)" }}
                                    >
                                      {commit.message}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {reasoningStyle && (
                                      <span
                                        className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
                                        style={{
                                          backgroundColor: reasoningStyle.bg,
                                          color: reasoningStyle.text,
                                          border: `1px solid ${reasoningStyle.border}`,
                                          fontSize: "10px",
                                        }}
                                      >
                                        {reasoningStyle.label}
                                      </span>
                                    )}
                                    <span
                                      className="text-xs whitespace-nowrap"
                                      style={{ color: "var(--fg-subtle)" }}
                                    >
                                      {formatRelativeTime(commit.created_at)}
                                    </span>
                                  </div>
                                </div>

                                {commit.semantic_summary && (
                                  <p
                                    className="text-xs mt-1 leading-relaxed pl-5"
                                    style={{ color: "var(--fg-muted)" }}
                                  >
                                    {commit.semantic_summary}
                                  </p>
                                )}

                                {commit.tags.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1.5 pl-5 flex-wrap">
                                    {commit.tags.map((tag, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded-full font-medium"
                                        style={{
                                          backgroundColor: "var(--bg-subtle)",
                                          color: "var(--fg-muted)",
                                          border:
                                            "1px solid var(--border-muted)",
                                          fontSize: "10px",
                                        }}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
