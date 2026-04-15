"use client";

import { useState } from "react";

export default function LoginClient({ secret, isCeo }: { secret: string; isCeo: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isCeo) {
      const res = await fetch("/api/auth/ceo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, password }),
      });
      if (res.ok) {
        window.location.href = `/${secret}/dashboard`;
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Invalid password.");
        setLoading(false);
      }
    } else {
      const res = await fetch("/api/auth/team-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, email, password }),
      });
      if (res.ok) {
        window.location.href = `/${secret}/student-pipeline`;
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Invalid email or password.");
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-rise-cream flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">RISE Portal</h1>
        <p className="text-sm text-gray.500 mb-6">
          {isCeo ? "Enter your password to continue" : "Sign in to access the student pipeline"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isCeo && (
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          )}

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus={isCeo}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-gray-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
