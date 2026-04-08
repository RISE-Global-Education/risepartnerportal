"use client";

import { useState, useEffect } from "react";

const ZONES = [
  { label: "EDT", iana: "America/New_York" },
  { label: "PDT", iana: "America/Los_Angeles" },
  { label: "IST", iana: "Asia/Kolkata" },
  { label: "SGT", iana: "Asia/Singapore" },
  { label: "GMT", iana: "Etc/GMT" },
];

function formatTime(iana: string): string {
  return new Date().toLocaleTimeString("en-US", {
    timeZone: iana,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export default function TimeZoneClocks() {
  const [times, setTimes] = useState<string[]>(() => ZONES.map((z) => formatTime(z.iana)));

  useEffect(() => {
    const id = setInterval(() => {
      setTimes(ZONES.map((z) => formatTime(z.iana)));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-wrap gap-4 my-3">
      {ZONES.map((zone, i) => (
        <div key={zone.label} className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-rise-brown uppercase tracking-wide">
            {zone.label}
          </span>
          <span className="text-sm font-mono text-rise-black">{times[i]}</span>
        </div>
      ))}
    </div>
  );
}
