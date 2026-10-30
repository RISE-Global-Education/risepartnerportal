"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const PERIODS = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "All time", value: "all" },
] as const;

export type TimePeriod = (typeof PERIODS)[number]["value"];

export default function TimePeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("period") as TimePeriod) || "7d";
  // Recomputing analytics for a new period can take a moment — dim the
  // selector meanwhile so the click visibly registered.
  const [isPending, startTransition] = useTransition();

  function select(value: TimePeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div
      className={`flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200 transition-opacity ${
        isPending ? "opacity-50 pointer-events-none" : ""
      }`}
      aria-busy={isPending}
    >
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => select(p.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            current === p.value
              ? "bg-rise-green text-white"
              : "text-rise-brown hover:bg-gray-50"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
