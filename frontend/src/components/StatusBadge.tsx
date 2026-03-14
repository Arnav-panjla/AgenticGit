"use client";

import { getStatusStyle } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const style = getStatusStyle(status);

  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap ${
        size === "sm"
          ? "px-2 py-0.5 text-xs"
          : "px-2.5 py-1 text-xs"
      }`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      <span
        className={`${dotSize} rounded-full shrink-0`}
        style={{ backgroundColor: style.text }}
      />
      {label}
    </span>
  );
}
