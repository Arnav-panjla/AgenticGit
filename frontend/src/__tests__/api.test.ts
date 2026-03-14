/**
 * API Client Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, agentApi, repoApi, issueApi, leaderboardApi, authApi } from "@/lib/api";

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );
  });

  describe("api.get", () => {
    it("makes GET request with correct URL", async () => {
      const mockData = { id: "1", name: "test" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await api.get("/test");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result).toEqual(mockData);
    });

    it("includes auth token when available", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockReturnValue("test-token");
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.get("/test");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("throws error on failed request", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not found" }),
      });

      await expect(api.get("/test")).rejects.toThrow("Not found");
    });
  });

  describe("api.post", () => {
    it("makes POST request with body", async () => {
      const mockData = { id: "1" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const body = { name: "test" };
      const result = await api.post("/test", body);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/test"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(body),
        })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("agentApi", () => {
    it("list fetches all agents", async () => {
      const mockAgents = [{ id: "1", ens_name: "agent.eth" }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAgents),
      });

      const result = await agentApi.list();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/agents"),
        expect.any(Object)
      );
      expect(result).toEqual(mockAgents);
    });

    it("get fetches single agent by ENS", async () => {
      const mockAgent = { id: "1", ens_name: "agent.eth" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAgent),
      });

      const result = await agentApi.get("agent.eth");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/agents/agent.eth"),
        expect.any(Object)
      );
      expect(result).toEqual(mockAgent);
    });

    it("create posts new agent", async () => {
      const mockAgent = {
        id: "1",
        ens_name: "new.eth",
        role: "researcher",
        capabilities: ["NLP"],
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAgent),
      });

      const data = {
        ens_name: "new.eth",
        role: "researcher",
        capabilities: ["NLP"],
      };
      const result = await agentApi.create(data);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/agents"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(data),
        })
      );
      expect(result).toEqual(mockAgent);
    });
  });

  describe("repoApi", () => {
    it("list fetches all repositories", async () => {
      const mockRepos = [{ id: "1", name: "repo1" }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRepos),
      });

      const result = await repoApi.list();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/repositories"),
        expect.any(Object)
      );
      expect(result).toEqual(mockRepos);
    });

    it("list fetches repositories filtered by academia type (v6)", async () => {
      const mockRepos = [
        { id: "1", name: "ml-research", repo_type: "academia", academia_field: "ML" },
      ];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRepos),
      });

      const result = await repoApi.list("academia");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/repositories?type=academia"),
        expect.any(Object)
      );
      expect(result).toEqual(mockRepos);
    });

    it("list fetches repositories filtered by general type (v6)", async () => {
      const mockRepos = [
        { id: "2", name: "web-app", repo_type: "general" },
      ];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRepos),
      });

      const result = await repoApi.list("general");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/repositories?type=general"),
        expect.any(Object)
      );
      expect(result).toEqual(mockRepos);
    });

    it("list without type filter does not include type param (v6)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await repoApi.list();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.not.stringContaining("type="),
        expect.any(Object)
      );
    });

    it("branches fetches repo branches", async () => {
      const mockBranches = [{ id: "1", name: "main" }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockBranches),
      });

      const result = await repoApi.branches("repo-1");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/repositories/repo-1/branches"),
        expect.any(Object)
      );
      expect(result).toEqual(mockBranches);
    });

    it("searchCommits sends correct query", async () => {
      const mockResults = [{ id: "c1", message: "found", similarity: 0.95 }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults),
      });

      const result = await repoApi.searchCommits("repo-1", "test query");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/repositories/repo-1/commits/search?q=test%20query"
        ),
        expect.any(Object)
      );
      expect(result).toEqual(mockResults);
    });
  });

  describe("issueApi", () => {
    it("list fetches issues with optional status filter", async () => {
      const mockIssues = [{ id: "1", title: "Bug" }];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIssues),
      });

      const result = await issueApi.list("repo-1", "open");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/repositories/repo-1/issues?status=open"),
        expect.any(Object)
      );
      expect(result).toEqual(mockIssues);
    });

    it("create posts new issue", async () => {
      const mockIssue = { id: "1", title: "New Issue" };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockIssue),
      });

      const issueData = { title: "New Issue", body: "Description" };
      const result = await issueApi.create("repo-1", issueData);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/repositories/repo-1/issues"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(issueData),
        })
      );
      expect(result).toEqual(mockIssue);
    });
  });

  describe("leaderboardApi", () => {
    it("get fetches leaderboard with parameters", async () => {
      const mockLeaderboard = [
        { rank: 1, ens_name: "a.eth", total_points: 100 },
      ];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLeaderboard),
      });

      const result = await leaderboardApi.get(10, 0, "month");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/leaderboard?limit=10&timeframe=month"
        ),
        expect.any(Object)
      );
      expect(result).toEqual(mockLeaderboard);
    });

    it("get passes sort_by and order params (v6)", async () => {
      const mockEntries = [
        { rank: 1, ens_name: "a.eth", reputation_score: 200 },
      ];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEntries),
      });

      const result = await leaderboardApi.get(10, 0, "all", "reputation_score", "asc");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("sort_by=reputation_score"),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("order=asc"),
        expect.any(Object)
      );
      expect(result).toEqual(mockEntries);
    });

    it("get passes sort_by=academic_contribution (v6)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await leaderboardApi.get(50, 0, "all", "academic_contribution", "desc");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("sort_by=academic_contribution"),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("order=desc"),
        expect.any(Object)
      );
    });

    it("get does not include sort_by if not provided (v6)", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await leaderboardApi.get(10, 0, "all");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.not.stringContaining("sort_by"),
        expect.any(Object)
      );
    });

    it("stats fetches platform statistics", async () => {
      const mockStats = { total_agents: 10, total_points: 1000 };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });

      const result = await leaderboardApi.stats();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/leaderboard/stats"),
        expect.any(Object)
      );
      expect(result).toEqual(mockStats);
    });

    it("stats returns v6 fields (total_repositories, academia_repositories)", async () => {
      const mockStats = {
        total_agents: 10,
        total_points: 5000,
        total_issues: 30,
        issues_closed: 25,
        total_repositories: 7,
        academia_repositories: 2,
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });

      const result = await leaderboardApi.stats();
      expect(result.total_repositories).toBe(7);
      expect(result.academia_repositories).toBe(2);
    });

    it("agentProfile fetches agent profile (v6)", async () => {
      const mockProfile = {
        ens_name: "research.eth",
        academic_contribution: 7.5,
        contributions: [
          { id: "r1", name: "ml-repo", repo_type: "academia", academia_field: "ML" },
        ],
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const result = await leaderboardApi.agentProfile("research.eth");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/leaderboard/agents/research.eth"),
        expect.any(Object)
      );
      expect(result.academic_contribution).toBe(7.5);
      expect(result.contributions[0].repo_type).toBe("academia");
    });

    it("get handles wrapped leaderboard response", async () => {
      const mockEntries = [
        { rank: 1, ens_name: "a.eth", total_points: 100 },
      ];
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ entries: mockEntries, pagination: { total: 1, limit: 10, offset: 0, hasMore: false } }),
      });

      const result = await leaderboardApi.get(10, 0, "all");

      expect(result).toEqual(mockEntries);
    });
  });

  describe("authApi", () => {
    it("login sends credentials", async () => {
      const mockResponse = {
        token: "jwt-token",
        user: { id: "1", username: "testuser" },
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authApi.login("testuser", "password");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/login"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ username: "testuser", password: "password" }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("register sends credentials", async () => {
      const mockResponse = {
        token: "jwt-token",
        user: { id: "1", username: "newuser" },
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authApi.register("newuser", "password");

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/auth/register"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ username: "newuser", password: "password" }),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
