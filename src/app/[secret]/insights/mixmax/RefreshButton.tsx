"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton({ apiPath, poll = false }: { apiPath: string; poll?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setError(null);
    setLabel(null);
    try {
      const res = await fetch(apiPath, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      if (poll && body.started) {
        // The refresh runs asynchronously (chunked via QStash); poll until it finishes.
        while (true) {
          await new Promise((r) => setTimeout(r, 2000));
          const statusRes = await fetch("/api/mixmax/status", { cache: "no-store" });
          const status = await statusRes.json().catch(() => ({ running: false }));
          if (!status.running) break;
          setLabel(`Refreshing… ${status.progress ?? 0}/${status.total ?? body.total ?? "?"}`);
        }
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setLoading(false);
      setLabel(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-white text-rise-brown hover:border-gray-400 hover:text-rise-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {loading ? (label ?? "Refreshing…") : "Refresh"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
