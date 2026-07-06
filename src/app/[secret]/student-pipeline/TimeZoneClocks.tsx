"use client";

import { useState, useEffect } from "react";

const ZONES = [
  { label: "EDT", iana: "America/New_York" },
  { label: "PDT", iana: "America/Los_Angeles" },
  { label: "IST", iana: "Asia/Kolkata" },
  { label: "SGT", iana: "Asia/Singapore" },
  { label: "GMT", iana: "Etc/GMT" },
];

function formatTime(iana: string, hour12: boolean): string {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: iana,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12,
  });
}

export default function TimeZoneClocks() {
  const [hour12, setHour12] = useState(true);
  const [times, setTimes] = useState<string[] | null>(null);

  useEffect(() => {
    setTimes(ZONES.map((z) => formatTime(z.iana, hour12)));
    const id = setInterval(() => {
      setTimes(ZONES.map((z) => formatTime(z.iana, hour12)));
    }, 1000);
    return () => clearInterval(id);
  }, [hour12]);

  return (
    <div className="flex items-center justify-between my-3">
      <div className="flex flex-wrap gap-4">
        {ZONES.map((zone, i) => (
          <div key={zone.label} className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-rise-brown uppercase tracking-wide">
              {zone.label}
            </span>
            <span className="text-sm font-mono text-rise-black">{times ? times[i] : "--:--:--"}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => setHour12((v) => !v)}
        className="ml-4 px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 text-rise-brown hover:text-rise-black hover:border-gray-300 transition-colors shrink-0"
      >
        {hour12 ? "24h" : "12h"}
      </button>
    </div>
  );
}
