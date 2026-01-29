"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [username, password]);

  useEffect(() => {
    document.documentElement.dataset.theme = "noir";
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter username and password.");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Login failed.");
      }
      const next = params.get("next") || "/";
      router.replace(next);
    } catch (err) {
      setError((err as Error).message ?? "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="body">
        <section className="panel" style={{ maxWidth: 420, margin: "0 auto" }}>
          <div className="header-min">
            <h3>Sign in</h3>
            <span className="pill small-pill ghost">Cam Analysis</span>
          </div>
          <form className="connector" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </div>
            {error && <div className="pill small-pill">{error}</div>}
            <div className="actions">
              <button className="btn-primary" type="submit" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
