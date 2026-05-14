"use client";

import { useState } from "react";
import Link from "next/link";

interface StalePartner {
  id: string;
  companyName: string;
  slug: string;
  counselorId: string;
  pocNames: string[];
  risePoc: string[];
  lastConversationDate: string | null;
  days: number | null;
}

export default function CallsClient({ partners, allRisePocs }: { partners: StalePartner[]; allRisePocs: string[] }) {
  const [selectedPoc, setSelectedPoc] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = partners
    .filter((p) => selectedPoc === "all" || p.risePoc.includes(selectedPoc))
    .filter((p) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        p.companyName.toLowerCase().includes(q) ||
        p.pocNames.some((n) => n.toLowerCase().includes(q)) ||
        p.risePoc.some((r) => r.toLowerCase().includes(q))
      );
    });

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by partner, contact, or RISE POC..."
        className="w-full px-4 py-2.5 mb-4 text-sm rounded-lg border border-gray-200 focus:border-rise-green focus:outline-none bg-white text-rise-black placeholder:text-rise-brown/50"
      />
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-rise-brown">
          {filtered.length} partner{filtered.length !== 1 ? "s" : ""} with no conversation in the last 28 days
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-rise-brown">POC (RISE):</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setSelectedPoc("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedPoc === "all"
                  ? "bg-rise-green text-white"
                  : "bg-gray-100 text-rise-brown hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {allRisePocs.map((poc) => (
              <button
                key={poc}
                onClick={() => setSelectedPoc(poc)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedPoc === poc
                    ? "bg-rise-green text-white"
                    : "bg-gray-100 text-rise-brown hover:bg-gray-200"
                }`}
              >
                {poc}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              <th className="px-5 py-3 font-medium text-rise-brown">Partner</th>
              <th className="px-5 py-3 font-medium text-rise-brown">Partner POC</th>
              <th className="px-5 py-3 font-medium text-rise-brown">POC (RISE)</th>
              <th className="px-5 py-3 font-medium text-rise-brown">Last Conversation</th>
              <th className="px-5 py-3 font-medium text-rise-brown">Days Ago</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const ceoSlug = `${c.slug}-${c.counselorId.toLowerCase()}`;
              return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-rise-cream/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-rise-black">{c.companyName}</td>
                  <td className="px-5 py-3 text-rise-brown">
                    {c.pocNames.length > 0 ? c.pocNames.join(", ") : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {c.risePoc.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.risePoc.map((p) => (
                          <span key={p} className="px-2 py-0.5 text-xs bg-rise-green/10 text-rise-green rounded-md font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-rise-brown">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-rise-brown">
                    {c.lastConversationDate
                      ? new Date(c.lastConversationDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : <span className="text-red-400">Never</span>}
                  </td>
                  <td className="px-5 py-3">
                    {c.days === null ? (
                      <span className="text-red-500 font-medium">—</span>
                    ) : (
                      <span className={c.days > 60 ? "text-red-500 font-medium" : "text-amber-500 font-medium"}>
                        {c.days}d
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/partner/${ceoSlug}`}
                      className="px-3 py-1.5 text-xs font-medium bg-rise-green/10 text-rise-green rounded-lg hover:bg-rise-green/20 transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-rise-brown">
                  {selectedPoc === "all"
                    ? "All partners have been contacted in the last 28 days."
                    : `No overdue partners for ${selectedPoc}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
