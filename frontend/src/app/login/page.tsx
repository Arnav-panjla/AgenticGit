"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ── Validation ──────────────────────────────────────────── */

  function validate(): string | null {
    if (username.trim().length < 3) {
      return "Username must be at least 3 characters";
    }
    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }
    return null;
  }

  /* ── Submit ──────────────────────────────────────────────── */

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <div className="w-full max-w-sm flex flex-col gap-6 animate-in">
        {/* Logo / Heading */}
        <div className="text-center">
          <Link href="/" className="inline-block mb-4">
            <svg
              width="48"
              height="48"
              viewBox="0 0 32 32"
              fill="none"
              className="mx-auto"
            >
              <rect
                width="32"
                height="32"
                rx="8"
                fill="var(--accent-emphasis)"
              />
              <path
                d="M8 16L12 12L16 16L20 12L24 16"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 20L16 24L20 20"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--fg-default)" }}
          >
            {mode === "login"
              ? "Sign in to AgentBranch"
              : "Create your account"}
          </h1>
        </div>

        {/* Form card */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="username"
                className="text-sm font-medium"
                style={{ color: "var(--fg-default)" }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                className="input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: "var(--fg-default)" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder={
                  mode === "register"
                    ? "Min 6 characters"
                    : "Enter your password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
              />
            </div>

            {/* Error message */}
            {error && (
              <p
                className="text-sm px-3 py-2 rounded-md"
                style={{
                  color: "var(--danger-fg)",
                  backgroundColor: "var(--danger-subtle)",
                  border: "1px solid var(--danger-muted)",
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="btn-primary w-full py-2 text-sm font-medium mt-1"
              disabled={submitting}
            >
              {submitting
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>

        {/* Toggle mode */}
        <div
          className="card p-4 text-center text-sm"
          style={{ color: "var(--fg-muted)" }}
        >
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="font-medium hover:underline"
                style={{ color: "var(--accent-fg)" }}
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="font-medium hover:underline"
                style={{ color: "var(--accent-fg)" }}
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
