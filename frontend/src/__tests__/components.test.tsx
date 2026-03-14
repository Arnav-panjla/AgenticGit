/**
 * Component Tests - StatusBadge, ScoreCard, CommitCard, LoadingSkeleton
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreCard } from "@/components/ScoreCard";
import { CommitCard } from "@/components/CommitCard";
import {
  CardSkeleton,
  TableSkeleton,
  PageSkeleton,
} from "@/components/LoadingSkeleton";
import type { Scorecard, Commit } from "@/lib/api";

/* ── StatusBadge ──────────────────────────────────────────────── */

describe("StatusBadge", () => {
  it("renders status text with title case", () => {
    render(<StatusBadge status="open" />);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("converts underscores to spaces and title-cases", () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders with small size", () => {
    const { container } = render(<StatusBadge status="closed" size="sm" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain("text-xs");
  });

  it("renders all status types without error", () => {
    const statuses = [
      "open",
      "in_progress",
      "closed",
      "cancelled",
      "merged",
      "rejected",
      "approved",
    ];
    statuses.forEach((status) => {
      const { unmount } = render(<StatusBadge status={status} />);
      const label = status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });
});

/* ── ScoreCard ────────────────────────────────────────────────── */

describe("ScoreCard", () => {
  const mockScorecard: Scorecard = {
    difficulty: "medium",
    base_points: 100,
    unit_tests: [
      { name: "test_auth", points: 30 },
      { name: "test_api", points: 20 },
    ],
    bonus_criteria: ["coverage > 90%", "no lint errors"],
    bonus_points_per_criterion: 25,
    time_limit_hours: 48,
    required_language: "TypeScript",
    importance: "P1",
  };

  describe("compact mode", () => {
    it("renders difficulty and points", () => {
      render(<ScoreCard scorecard={mockScorecard} mode="compact" />);
      expect(screen.getByText("medium")).toBeInTheDocument();
      expect(screen.getByText("100 pts")).toBeInTheDocument();
    });

    it("shows correct difficulty for each level", () => {
      const difficulties: Array<
        "easy" | "medium" | "hard" | "expert"
      > = ["easy", "medium", "hard", "expert"];

      difficulties.forEach((d) => {
        const { unmount } = render(
          <ScoreCard scorecard={{ ...mockScorecard, difficulty: d }} mode="compact" />
        );
        expect(screen.getByText(d)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("full mode", () => {
    it("renders scorecard header", () => {
      render(<ScoreCard scorecard={mockScorecard} mode="full" />);
      expect(screen.getByText("Scorecard")).toBeInTheDocument();
    });

    it("renders base points", () => {
      render(<ScoreCard scorecard={mockScorecard} mode="full" />);
      expect(screen.getByText("100")).toBeInTheDocument();
      expect(screen.getByText("base points")).toBeInTheDocument();
    });

    it("renders max points when bonus exists", () => {
      render(<ScoreCard scorecard={mockScorecard} mode="full" />);
      // max = 100 + 2 * 25 = 150
      expect(screen.getByText("150")).toBeInTheDocument();
      expect(screen.getByText("max")).toBeInTheDocument();
    });

    it("renders time limit", () => {
      render(<ScoreCard scorecard={mockScorecard} mode="full" />);
      expect(screen.getByText("Time Limit")).toBeInTheDocument();
      expect(screen.getByText("48h")).toBeInTheDocument();
    });

    it("renders required language", () => {
      render(<ScoreCard scorecard={mockScorecard} mode="full" />);
      expect(screen.getByText("Language")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });

    it("renders importance/priority", () => {
      render(<ScoreCard scorecard={mockScorecard} mode="full" />);
      expect(screen.getByText("Priority")).toBeInTheDocument();
      expect(screen.getByText("P1")).toBeInTheDocument();
    });

    it("renders unit tests", () => {
      render(<ScoreCard scorecard={mockScorecard} mode="full" />);
      expect(screen.getByText("Unit Tests (2)")).toBeInTheDocument();
      expect(screen.getByText("test_auth")).toBeInTheDocument();
      expect(screen.getByText("test_api")).toBeInTheDocument();
    });

    it("renders bonus criteria", () => {
      render(<ScoreCard scorecard={mockScorecard} mode="full" />);
      expect(screen.getByText("Bonus Criteria")).toBeInTheDocument();
      expect(screen.getByText("coverage > 90%")).toBeInTheDocument();
      expect(screen.getByText("no lint errors")).toBeInTheDocument();
      expect(screen.getByText("+25 pts each")).toBeInTheDocument();
    });
  });
});

/* ── CommitCard ───────────────────────────────────────────────── */

describe("CommitCard", () => {
  const mockCommit: Commit = {
    id: "c1",
    repo_id: "r1",
    branch_id: "b1",
    message: "Add authentication module",
    author_ens: "alpha.eth",
    branch_name: "main",
    semantic_summary: "Implements JWT-based auth with refresh tokens",
    tags: ["auth", "security"],
    reasoning_type: "knowledge",
    created_at: new Date().toISOString(),
  };

  it("renders commit message", () => {
    render(<CommitCard commit={mockCommit} />);
    expect(
      screen.getByText("Add authentication module")
    ).toBeInTheDocument();
  });

  it("renders author ENS as a link", () => {
    render(<CommitCard commit={mockCommit} />);
    const link = screen.getByText("alpha.eth");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/agents/alpha.eth");
  });

  it("renders branch name", () => {
    render(<CommitCard commit={mockCommit} />);
    expect(screen.getByText("main")).toBeInTheDocument();
  });

  it("renders semantic summary", () => {
    render(<CommitCard commit={mockCommit} />);
    expect(
      screen.getByText("Implements JWT-based auth with refresh tokens")
    ).toBeInTheDocument();
  });

  it("renders tags", () => {
    render(<CommitCard commit={mockCommit} />);
    expect(screen.getByText("auth")).toBeInTheDocument();
    expect(screen.getByText("security")).toBeInTheDocument();
  });

  it("renders reasoning type badge", () => {
    render(<CommitCard commit={mockCommit} />);
    expect(screen.getByText("Knowledge")).toBeInTheDocument();
  });

  it("renders relative time", () => {
    render(<CommitCard commit={mockCommit} />);
    expect(screen.getByText("just now")).toBeInTheDocument();
  });

  it("does not render trace section when no trace data", () => {
    render(<CommitCard commit={mockCommit} />);
    expect(screen.queryByText("Trace Data")).not.toBeInTheDocument();
  });

  it("renders trace toggle when trace data exists", () => {
    const commitWithTrace: Commit = {
      ...mockCommit,
      trace_prompt: "Analyze the codebase",
      trace_tools: ["grep", "read"],
      trace_result: "Found 3 files",
    };
    render(<CommitCard commit={commitWithTrace} />);
    expect(screen.getByText("Trace Data")).toBeInTheDocument();
    expect(screen.getByText("2 tools")).toBeInTheDocument();
  });

  it("expands trace data on click", async () => {
    const commitWithTrace: Commit = {
      ...mockCommit,
      trace_prompt: "Analyze the codebase",
      trace_tools: ["grep"],
      trace_result: "Found 3 files",
    };
    render(<CommitCard commit={commitWithTrace} />);

    const toggle = screen.getByText("Trace Data");
    await userEvent.click(toggle);

    expect(screen.getByText("Prompt")).toBeInTheDocument();
    expect(screen.getByText("Analyze the codebase")).toBeInTheDocument();
    expect(screen.getByText("Tools Used")).toBeInTheDocument();
    expect(screen.getByText("grep")).toBeInTheDocument();
    expect(screen.getByText("Result")).toBeInTheDocument();
    expect(screen.getByText("Found 3 files")).toBeInTheDocument();
  });

  it("renders with no optional fields", () => {
    const minimal: Commit = {
      id: "c2",
      repo_id: "r1",
      branch_id: "b1",
      message: "Simple commit",
      created_at: new Date().toISOString(),
    };
    render(<CommitCard commit={minimal} />);
    expect(screen.getByText("Simple commit")).toBeInTheDocument();
  });
});

/* ── LoadingSkeleton ──────────────────────────────────────────── */

describe("LoadingSkeleton", () => {
  it("renders CardSkeleton", () => {
    const { container } = render(<CardSkeleton />);
    const skeletons = container.querySelectorAll(".skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders TableSkeleton with default rows/columns", () => {
    const { container } = render(<TableSkeleton />);
    const skeletons = container.querySelectorAll(".skeleton");
    // 4 header cells + 5 rows * 4 cols = 24
    expect(skeletons.length).toBe(24);
  });

  it("renders TableSkeleton with custom rows/columns", () => {
    const { container } = render(<TableSkeleton rows={3} columns={2} />);
    const skeletons = container.querySelectorAll(".skeleton");
    // 2 header + 3 * 2 = 8
    expect(skeletons.length).toBe(8);
  });

  it("renders PageSkeleton with cards", () => {
    const { container } = render(<PageSkeleton />);
    const cards = container.querySelectorAll(".card");
    expect(cards.length).toBe(6); // 6 CardSkeleton instances
  });
});
