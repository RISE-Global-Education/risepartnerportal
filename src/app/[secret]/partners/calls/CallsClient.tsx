"use client";

import { useState } from "react";
import Link from "next/link";

const FOLLOW_UP_OPTIONS = [
  "MOU Signed",
  "Partnership",
  "Pending",
  "Rejected",
  "Unqualified",
] as const;

type FollowUpStatus = (typeof FOLLOW_UP_OPTIONS)[number] | "";

const HIDDEN_STATUSES: FollowUpStatus[] = ["Rejected", "Unqualified"];

const STATUS_STYLES: Record<string, string> = {
  "MOU Signed":  "bg-green-100 text-green-700",
  "Partnership": "bg-blue-100 text-blue-700",
  "Pending":     "bg-amber-100 text-amber-700",
  "Rejected":    "bg-red-100 text-red-700",
  "Unqualified": "bg-red-100 text-red-700",
  "":            "bg-gray-100 text-gray-500",
};

interface StalePartner {
  id: string;
  companyName: string;
  slug: string;
  counselorId: string;
  pocNames: string[];
  risePoc: string[];
  followUpStatus: string;
  partnerType: string;
  lastConversationDate: string | null;
  days: number | null;
}

export default function CallsClient({
  partners,
  allRisePocs,
  secret,
}: {
  partners: StalePartner[];
  allRisePocs: string[];
  secret: string;
}) {
  const [selectedPoc, setSelectedPoc] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState<StalePartner[]>(partners);
  const [updating, setUpdating] = useState<string | null>(null);

  const filtered = visible
    .filter((p) => selectedPoc === "all" || p.risePoc.includes(selectedPoc))
    .filter((p) => selectedType === "all" || p.partnerType === selectedType)
    .filter((p) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        p.companyName.toLowerCase().includes(q) ||
        p.pocNames.some((n) => n.toLowerCase().includes(q)) ||
        p.risePoc.some((r) => r.toLowerCase().includes(q))
      );
    });

  async function handleStatusChange(partner: StalePartner, newStatus: string) {
    setUpdating(partner.id);
    try {
      const res = await fetch("/api/counselors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          recordId: partner.id,
          fields: { "Follow Up Status": newStatus },
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      if (HIDDEN_STATUSES.includes(newStatus as FollowUpStatus)) {
        // Remove from portal view immediately — not deleted from Airtable
        setVisible((prev) => prev.filter((p) => p.id !== partner.id));
      } else {
        // Update status in local state
        setVisible((prev) =>
          prev.map((p) =>
            p.id === partner.id ? { ...p, followUpStatus: newStatus } : p
          )
        );
      }
    } catch {
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by partner, contact, or RISE POC..."
        className="w-full px-4 py-2.5 mb-4 text-sm rounded-lg border border-gray-200 focus:border-rise-green focus:outline-none bg-white text-rise-black placeholder:text-rise-brown/50"
      />
      <div className="flex items-center justify-between mb-3">
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

      {/* Partner Type filter */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-rise-brown">Partner Type:</span>
          <div className="flex gap-1.5">
            {(["all", "Counsellor", "School"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  selectedType === type
                    ? "bg-rise-green text-white"
                    : "bg-gray-100 text-rise-brown hover:bg-gray-200"
                }`}
              >
                {type === "all" ? "All" : type}
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
              <th className="px-5 py-3 font-medium text-rise-brown">Follow Up Status</th>
              <th className="px-5 py-3 font-medium text-rise-brown">POC (RISE)</th>
              <th className="px-5 py-3 font-medium text-rise-brown">Last Conversation</th>
              <th className="px-5 py-3 font-medium text-rise-brown">Days Ago</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const ceoSlug = `${c.slug}-${c.counselorId.toLowerCase()}`;
              const isUpdating = updating === c.id;
              return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-rise-cream/40 transition-colors">
                  <td className="px-5 py-3 font-medium text-rise-black">{c.companyName}</td>
                  <td className="px-5 py-3 text-rise-brown">
                    {c.pocNames.length > 0 ? c.pocNames.join(", ") : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="relative inline-block">
                      <select
                        value={c.followUpStatus}
                        disabled={isUpdating}
                        onChange={(e) => handleStatusChange(c, e.target.value)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-md border-0 cursor-pointer appearance-none pr-6 focus:outline-none focus:ring-2 focus:ring-rise-green/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                          STATUS_STYLES[c.followUpStatus] ?? STATUS_STYLES[""]
                        }`}
                      >
                        <option value="">— Select —</option>
                        {FOLLOW_UP_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-xs">
                        {isUpdating ? "⟳" : "▾"}
                      </span>
                    </div>
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
                          day: "numeric", month: "short", year: "numeric",
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
                <td colSpan={7} className="px-5 py-10 text-center text-rise-brown">
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
