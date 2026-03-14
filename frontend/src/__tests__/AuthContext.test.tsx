/**
 * AuthContext Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Test component that exercises auth
function TestComponent() {
  const { user, isAuthenticated, login, logout, isLoading, register } =
    useAuth();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <span data-testid="auth-status">
        {isAuthenticated ? "authenticated" : "anonymous"}
      </span>
      {user && <span data-testid="username">{user.username}</span>}
      <button onClick={() => login("testuser", "password123")}>Login</button>
      <button onClick={() => register("newuser", "newpass")}>Register</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );
  });

  it("provides initial unauthenticated state", async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("anonymous");
    });
  });

  it("handles login successfully", async () => {
    const mockLoginResponse = {
      token: "test-token",
      user: { id: "1", username: "testuser" },
    };

    const mockMeResponse = {
      user: { id: "1", username: "testuser" },
      agents: [],
    };

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLoginResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMeResponse),
      });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("anonymous");
    });

    const loginButton = screen.getByRole("button", { name: /login/i });
    await act(async () => {
      await userEvent.click(loginButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated"
      );
      expect(screen.getByTestId("username")).toHaveTextContent("testuser");
    });
  });

  it("handles logout", async () => {
    // Start with authenticated state
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === "ab_token") return "test-token";
        return null;
      }
    );

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: "1", username: "testuser" },
          agents: [],
        }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated"
      );
    });

    const logoutButton = screen.getByRole("button", { name: /logout/i });
    await act(async () => {
      await userEvent.click(logoutButton);
    });

    expect(screen.getByTestId("auth-status")).toHaveTextContent("anonymous");
    expect(window.localStorage.removeItem).toHaveBeenCalledWith("ab_token");
  });

  it("handles register successfully", async () => {
    const mockRegisterResponse = {
      token: "new-token",
      user: { id: "2", username: "newuser" },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockRegisterResponse),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("anonymous");
    });

    const registerButton = screen.getByRole("button", { name: /register/i });
    await act(async () => {
      await userEvent.click(registerButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated"
      );
      expect(screen.getByTestId("username")).toHaveTextContent("newuser");
    });
  });

  it("throws error when useAuth is used outside provider", () => {
    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useAuth must be used within AuthProvider");

    consoleSpy.mockRestore();
  });

  it("restores session from stored token", async () => {
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === "ab_token") return "saved-token";
        return null;
      }
    );

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: "1", username: "returning-user" },
          agents: [
            {
              id: "a1",
              ens_name: "agent.eth",
              role: "researcher",
              capabilities: [],
              reputation_score: 50,
              created_at: "2024-01-01",
            },
          ],
        }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated"
      );
      expect(screen.getByTestId("username")).toHaveTextContent("returning-user");
    });
  });

  it("clears token on session restore failure", async () => {
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === "ab_token") return "expired-token";
        return null;
      }
    );

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Unauthorized")
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent("anonymous");
      expect(window.localStorage.removeItem).toHaveBeenCalledWith("ab_token");
    });
  });
});
