/**
 * Component Tests - StatusBadge, ScoreCard, CommitCard, LoadingSkeleton, ContextChain
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusBadge } from "@/components/StatusBadge";
import { ScoreCard } from "@/components/ScoreCard";
import { CommitCard } from "@/components/CommitCard";
import {
  CardSkeleton,
  TableSkeleton,
  PageSkeleton,
} from "@/components/LoadingSkeleton";
import { ContextChain } from "@/components/ContextChain";
import type { Scorecard, Commit, ContextChain as ContextChainType } from "@/lib/api";

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

/* ── ContextChain ─────────────────────────────────────────────── */

describe("ContextChain", () => {
  const mockChainData: ContextChainType = {
    repo_id: "repo-1",
    total_commits: 5,
    total_agents: 3,
    handoffs: [
      {
        agent: { id: "a1", ens_name: "architect-agent.eth", role: "architect" },
        commits: [
          {
            id: "c1",
            message: "Plan Sudoku architecture",
            semantic_summary: "Component hierarchy and data model for Sudoku game",
            reasoning_type: "knowledge",
            tags: ["architecture", "planning"],
            created_at: new Date().toISOString(),
            branch_name: "main",
          },
        ],
        contribution_summary: "Designed overall architecture and data model",
      },
      {
        agent: { id: "a2", ens_name: "engineer-agent.eth", role: "engineer" },
        commits: [
          {
            id: "c2",
            message: "Implement puzzle generator",
            semantic_summary: "Backtracking algorithm for valid Sudoku puzzles",
            reasoning_type: "experiment",
            tags: ["implementation", "algorithm"],
            created_at: new Date().toISOString(),
            branch_name: "main",
          },
          {
            id: "c3",
            message: "Add solver validation",
            semantic_summary: null,
            reasoning_type: "trace",
            tags: [],
            created_at: new Date().toISOString(),
            branch_name: "main",
          },
        ],
        contribution_summary: "Implemented core game logic and solver",
      },
      {
        agent: { id: "a3", ens_name: "qa-agent.eth", role: "qa" },
        commits: [
          {
            id: "c4",
            message: "Add test coverage for solver",
            semantic_summary: "Unit tests covering edge cases in puzzle generation",
            reasoning_type: "conclusion",
            tags: ["testing"],
            created_at: new Date().toISOString(),
            branch_name: "main",
          },
          {
            id: "c5",
            message: "Integration test suite",
            semantic_summary: null,
            reasoning_type: null,
            tags: [],
            created_at: new Date().toISOString(),
            branch_name: "main",
          },
        ],
        contribution_summary: "Validated correctness with comprehensive tests",
      },
    ],
  };

  function mockFetchSuccess(data: ContextChainType) {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(data),
    });
  }

  function mockFetchError(message: string) {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: message }),
    });
  }

  it("renders loading state initially", () => {
    // Never resolve so component stays in loading state
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise(() => {})
    );
    const { container } = render(<ContextChain repoId="repo-1" />);
    // Loading skeleton has placeholder divs
    expect(container.querySelector(".card")).toBeInTheDocument();
  });

  it("renders empty state when no handoffs", async () => {
    mockFetchSuccess({
      repo_id: "repo-1",
      total_commits: 0,
      total_agents: 0,
      handoffs: [],
    });

    render(<ContextChain repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("Agent Context Chain")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/No commits yet/)
    ).toBeInTheDocument();
  });

  it("renders error state when fetch fails", async () => {
    mockFetchError("Internal server error");

    render(<ContextChain repoId="repo-1" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load context chain/)
      ).toBeInTheDocument();
    });
  });

  it("renders all handoff segments with agent names", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("architect-agent.eth")).toBeInTheDocument();
    });
    expect(screen.getByText("engineer-agent.eth")).toBeInTheDocument();
    expect(screen.getByText("qa-agent.eth")).toBeInTheDocument();
  });

  it("renders agent role badges", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("architect")).toBeInTheDocument();
    });
    expect(screen.getByText("engineer")).toBeInTheDocument();
    expect(screen.getByText("qa")).toBeInTheDocument();
  });

  it("renders commit counts per segment", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("1 commit")).toBeInTheDocument();
    });
    // engineer and qa both have 2 commits
    const twoCommits = screen.getAllByText("2 commits");
    expect(twoCommits.length).toBe(2);
  });

  it("renders summary stats in header", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText(/3 agents/)).toBeInTheDocument();
    });
    expect(screen.getByText(/5 commits/)).toBeInTheDocument();
    expect(screen.getByText(/3 handoffs/)).toBeInTheDocument();
  });

  it("renders contribution summaries", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    await waitFor(() => {
      expect(
        screen.getByText("Designed overall architecture and data model")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("Implemented core game logic and solver")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Validated correctness with comprehensive tests")
    ).toBeInTheDocument();
  });

  it("renders handoff arrows between segments", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    await waitFor(() => {
      expect(screen.getByText("architect-agent.eth")).toBeInTheDocument();
    });
    // There should be handoff labels between segments (2 arrows for 3 segments)
    const handoffs = screen.getAllByText("handoff");
    expect(handoffs.length).toBe(2);
  });

  it("auto-expands the last segment", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    // The last segment (qa-agent) should be auto-expanded, showing its commit messages
    await waitFor(() => {
      expect(
        screen.getByText("Add test coverage for solver")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("Integration test suite")
    ).toBeInTheDocument();
  });

  it("toggles segment expansion on click", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    // Wait for render
    await waitFor(() => {
      expect(screen.getByText("architect-agent.eth")).toBeInTheDocument();
    });

    // First segment (architect) is NOT expanded by default (only last is)
    expect(
      screen.queryByText("Plan Sudoku architecture")
    ).not.toBeInTheDocument();

    // Click on the architect segment button to expand it
    const architectButton = screen.getByText("architect-agent.eth").closest("button");
    if (architectButton) {
      await userEvent.click(architectButton);
    }

    // Now the architect commit should be visible
    await waitFor(() => {
      expect(
        screen.getByText("Plan Sudoku architecture")
      ).toBeInTheDocument();
    });
  });

  it("renders tags on expanded commits", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    // Last segment is auto-expanded — its first commit has tags: ["testing"]
    await waitFor(() => {
      expect(screen.getByText("testing")).toBeInTheDocument();
    });
  });

  it("renders reasoning type badges on expanded commits", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    // Last segment auto-expanded — first commit has reasoning_type: "conclusion"
    await waitFor(() => {
      expect(screen.getByText("Conclusion")).toBeInTheDocument();
    });
  });

  it("renders agent ENS names as links", async () => {
    mockFetchSuccess(mockChainData);

    render(<ContextChain repoId="repo-1" />);

    await waitFor(() => {
      const link = screen.getByText("architect-agent.eth");
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "/agents/architect-agent.eth"
      );
    });
  });
});
