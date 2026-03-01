"use client";

import { useState } from "react";

interface Step {
  name: string;
  ok: boolean;
  detail: string;
}

type Status = "idle" | "running" | "done";

export default function MasterTestButton({ secret }: { secret: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setStatus("running");
    setSteps([]);
    setError(null);

    try {
      const res = await fetch("/api/test/daily-check", {
        method: "POST",
        headers: { "x-dashboard-secret": secret },
      });
      const body = await res.json();
      if (!res.ok && !body.steps) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSteps(body.steps ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setStatus("done");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={run}
        disabled={status === "running"}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {status === "running" ? (
          <>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Running test…
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Master test
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {steps.length > 0 && (
        <div className="w-72 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden text-xs">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex gap-2 px-3 py-2.5 border-b last:border-b-0 ${
                step.ok ? "bg-white" : "bg-red-50"
              }`}
            >
              <span className={`mt-0.5 shrink-0 text-base leading-none ${step.ok ? "text-emerald-500" : "text-red-500"}`}>
                {step.ok ? "✓" : "✗"}
              </span>
              <div className="min-w-0">
                <p className={`font-semibold ${step.ok ? "text-rise-black" : "text-red-700"}`}>
                  {step.name}
                </p>
                <p className="text-rise-brown/70 mt-0.5 break-words">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
