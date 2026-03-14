import Link from "next/link";
import type { ReactNode } from "react";

type RepoSection = "code" | "issues" | "pulls";

interface RepoSectionHeaderProps {
  repoId: string;
  section: RepoSection;
  title: string;
  titleIcon?: ReactNode;
  subtitle?: string;
  repoLabel?: string;
  countLabel?: string;
  rightContent?: ReactNode;
}

const TABS: Array<{ key: RepoSection; label: string; href: (id: string) => string }> = [
  { key: "code", label: "Code", href: (id) => `/repo/${id}` },
  { key: "pulls", label: "Pull Requests", href: (id) => `/repo/${id}/pulls` },
  { key: "issues", label: "Issues", href: (id) => `/repo/${id}/issues` },
];

export function RepoSectionHeader({
  repoId,
  section,
  title,
  titleIcon,
  subtitle,
  repoLabel,
  countLabel,
  rightContent,
}: RepoSectionHeaderProps) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-4 pb-3">
        <nav className="flex items-center gap-1.5 text-sm mb-3" style={{ color: "var(--fg-subtle)" }}>
          <Link
            href={`/repo/${repoId}`}
            className="hover:underline"
            style={{ color: "var(--accent-fg)" }}
          >
            {repoLabel ?? "Repository"}
          </Link>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" />
          </svg>
          <span style={{ color: "var(--fg-muted)" }}>{title}</span>
        </nav>

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {titleIcon && <span style={{ color: "var(--fg-muted)" }}>{titleIcon}</span>}
              <h1 className="text-xl font-bold" style={{ color: "var(--fg-default)" }}>
                {title}
              </h1>
              {countLabel && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    color: "var(--fg-muted)",
                    border: "1px solid var(--border-muted)",
                  }}
                >
                  {countLabel}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          {rightContent}
        </div>
      </div>

      <div
        className="flex items-center gap-1 p-1 border-t"
        style={{
          borderColor: "var(--border-muted)",
          backgroundColor: "var(--bg-subtle)",
        }}
      >
        {TABS.map((tab) => {
          const active = tab.key === section;
          return (
            <Link
              key={tab.key}
              href={tab.href(repoId)}
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
              style={{
                color: active ? "var(--fg-default)" : "var(--fg-muted)",
                backgroundColor: active ? "var(--bg-default)" : "transparent",
                border: active
                  ? "1px solid var(--border-default)"
                  : "1px solid transparent",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
