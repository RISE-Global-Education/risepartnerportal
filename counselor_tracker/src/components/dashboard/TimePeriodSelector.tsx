"use client";

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
  const current = (searchParams.get("period") as TimePeriod) || "30d";

  function select(value: TimePeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
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
