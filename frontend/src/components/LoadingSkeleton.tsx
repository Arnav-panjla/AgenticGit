"use client";

/* ── CardSkeleton ────────────────────────────────────────────── */

export function CardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="skeleton h-5 w-2/5 rounded" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      {/* Description lines */}
      <div className="space-y-2">
        <div className="skeleton h-3.5 w-full rounded" />
        <div className="skeleton h-3.5 w-3/4 rounded" />
      </div>
      {/* Footer row */}
      <div className="flex items-center gap-3 pt-2">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-3 w-12 rounded" />
      </div>
    </div>
  );
}

/* ── TableSkeleton ───────────────────────────────────────────── */

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{
        backgroundColor: "var(--bg-default)",
        borderColor: "var(--border-default)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 py-3 border-b"
        style={{
          backgroundColor: "var(--bg-subtle)",
          borderColor: "var(--border-muted)",
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`head-${i}`}
            className="skeleton h-3.5 rounded"
            style={{
              width: i === 0 ? "30%" : `${Math.max(8, 18 - i * 3)}%`,
            }}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0"
          style={{ borderColor: "var(--border-muted)" }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={`cell-${rowIdx}-${colIdx}`}
              className="skeleton h-3.5 rounded"
              style={{
                width:
                  colIdx === 0
                    ? "30%"
                    : `${Math.max(6, 18 - colIdx * 3)}%`,
                animationDelay: `${rowIdx * 75}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── PageSkeleton ────────────────────────────────────────────── */

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in">
      {/* Page header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-lg" />
            <div className="space-y-2">
              <div className="skeleton h-6 w-48 rounded" />
              <div className="skeleton h-3.5 w-64 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton h-8 w-24 rounded-md" />
            <div className="skeleton h-8 w-20 rounded-md" />
          </div>
        </div>

        {/* Stat bar */}
        <div
          className="flex items-center gap-6 px-4 py-3 rounded-lg border"
          style={{
            backgroundColor: "var(--bg-default)",
            borderColor: "var(--border-muted)",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`stat-${i}`} className="flex items-center gap-2">
              <div className="skeleton w-4 h-4 rounded" />
              <div
                className="skeleton h-3.5 rounded"
                style={{ width: `${60 + i * 10}px` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={`card-${i}`} />
        ))}
      </div>
    </div>
  );
}
