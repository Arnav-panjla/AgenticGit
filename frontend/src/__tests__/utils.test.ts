/**
 * Utility Function Tests
 */

import { describe, it, expect } from "vitest";
import {
  stringToColor,
  stringToGradient,
  formatRelativeTime,
  formatNumber,
  truncateAddress,
  getRoleColor,
  getReasoningTypeStyle,
  getDifficultyStyle,
  getStatusStyle,
} from "@/lib/utils";

describe("stringToColor", () => {
  it("returns a consistent HSL color for the same string", () => {
    const c1 = stringToColor("test");
    const c2 = stringToColor("test");
    expect(c1).toBe(c2);
    expect(c1).toMatch(/^hsl\(\d+, 60%, 45%\)$/);
  });

  it("returns different colors for different strings", () => {
    const c1 = stringToColor("alpha");
    const c2 = stringToColor("beta");
    expect(c1).not.toBe(c2);
  });
});

describe("stringToGradient", () => {
  it("returns a linear-gradient string", () => {
    const g = stringToGradient("test-repo");
    expect(g).toMatch(/^linear-gradient\(135deg,/);
    expect(g).toContain("hsl(");
  });
});

describe("formatRelativeTime", () => {
  it('returns "just now" for very recent dates', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(
      Date.now() - 3 * 60 * 60 * 1000
    ).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe("2d ago");
  });

  it("returns a date string for dates older than 30 days", () => {
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatRelativeTime(old);
    // Should be a locale date string, not "Xd ago"
    expect(result).not.toContain("d ago");
  });
});

describe("formatNumber", () => {
  it("formats numbers with commas", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("handles small numbers", () => {
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(0)).toBe("0");
  });
});

describe("truncateAddress", () => {
  it("truncates long addresses", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    const result = truncateAddress(addr);
    expect(result).toBe("0x123456...345678");
    expect(result.length).toBeLessThan(addr.length);
  });

  it("returns short addresses unchanged", () => {
    const short = "0x1234";
    expect(truncateAddress(short)).toBe(short);
  });

  it("respects custom chars parameter", () => {
    const addr = "0x1234567890abcdef1234567890abcdef12345678";
    const result = truncateAddress(addr, 4);
    expect(result).toBe("0x1234...5678");
  });
});

describe("getRoleColor", () => {
  it("returns colors for known roles", () => {
    const result = getRoleColor("researcher");
    expect(result).toHaveProperty("bg");
    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("border");
  });

  it("returns fallback for unknown roles", () => {
    const result = getRoleColor("unknown-role");
    expect(result.text).toBe("var(--fg-muted)");
  });

  it("handles all defined roles", () => {
    const roles = [
      "researcher",
      "engineer",
      "auditor",
      "data-scientist",
      "devops",
      "frontend",
      "architect",
      "qa",
    ];
    roles.forEach((role) => {
      const result = getRoleColor(role);
      expect(result.bg).toBeTruthy();
      expect(result.text).toBeTruthy();
      expect(result.border).toBeTruthy();
    });
  });
});

describe("getReasoningTypeStyle", () => {
  it("returns styles for known reasoning types", () => {
    const types = ["knowledge", "hypothesis", "experiment", "conclusion", "trace"];
    types.forEach((type) => {
      const result = getReasoningTypeStyle(type);
      expect(result).toHaveProperty("bg");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("border");
      expect(result).toHaveProperty("label");
    });
  });

  it("returns proper label for knowledge type", () => {
    expect(getReasoningTypeStyle("knowledge").label).toBe("Knowledge");
  });

  it("returns fallback for unknown types", () => {
    const result = getReasoningTypeStyle("unknown");
    expect(result.label).toBe("unknown");
    expect(result.text).toBe("var(--fg-muted)");
  });
});

describe("getDifficultyStyle", () => {
  it("returns styles for all difficulty levels", () => {
    const diffs = ["easy", "medium", "hard", "expert"];
    diffs.forEach((d) => {
      const result = getDifficultyStyle(d);
      expect(result).toHaveProperty("bg");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("border");
    });
  });

  it("returns fallback for unknown difficulty", () => {
    const result = getDifficultyStyle("legendary");
    expect(result.text).toBe("var(--fg-muted)");
  });
});

describe("getStatusStyle", () => {
  it("returns styles for all statuses", () => {
    const statuses = [
      "open",
      "in_progress",
      "closed",
      "cancelled",
      "merged",
      "rejected",
      "approved",
    ];
    statuses.forEach((s) => {
      const result = getStatusStyle(s);
      expect(result).toHaveProperty("bg");
      expect(result).toHaveProperty("text");
      expect(result).toHaveProperty("border");
    });
  });

  it("returns fallback for unknown status", () => {
    const result = getStatusStyle("unknown");
    expect(result.text).toBe("var(--fg-muted)");
  });
});
