"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface PartnerOption {
  id: string;
  companyName: string;
}

export default function LogConversationForm({
  partners,
  secret,
}: {
  partners: PartnerOption[];
  secret: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerDropdownOpen, setPartnerDropdownOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerOption | null>(null);

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [attendee, setAttendee] = useState("");
  const [intent, setIntent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/attendees")
      .then((r) => r.json())
      .then((data) => setAttendees(data.attendees ?? []));
  }, [isOpen]);

  const matches = useMemo(() => {
    const q = partnerQuery.trim().toLowerCase();
    if (!q) return partners.slice(0, 8);
    return partners
      .filter((p) => p.companyName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [partners, partnerQuery]);

  function reset() {
    setSelectedPartner(null);
    setPartnerQuery("");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setAttendee("");
    setIntent("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPartner || !notes.trim() || !intent) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          counselorId: selectedPartner.id,
          counselorName: selectedPartner.companyName,
          date,
          notes: notes.trim(),
          attendee: attendee || undefined,
          intent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      reset();
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-rise-green text-white text-sm font-medium rounded-lg hover:bg-rise-green/90 transition-colors"
        >
          + Log Conversation
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-rise-black font-heading">Log Conversation</h2>
        <button
          onClick={() => {
            reset();
            setIsOpen(false);
          }}
          className="text-sm text-rise-brown hover:text-rise-black"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-rise-black mb-1">Partner</label>
          {selectedPartner ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 text-sm bg-rise-cream/40">
              <span className="font-medium text-rise-black">{selectedPartner.companyName}</span>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="text-xs text-rise-brown hover:text-rise-black"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={partnerQuery}
                onChange={(e) => setPartnerQuery(e.target.value)}
                onFocus={() => setPartnerDropdownOpen(true)}
                onBlur={() => setTimeout(() => setPartnerDropdownOpen(false), 150)}
                placeholder="Search partners..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
              />
              {partnerDropdownOpen && matches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-56 overflow-y-auto">
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPartner(p);
                        setPartnerDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-rise-black hover:bg-rise-cream/60 transition-colors"
                    >
                      {p.companyName}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-rise-black mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rise-black mb-1">Attendee</label>
            <select
              value={attendee}
              onChange={(e) => setAttendee(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
            >
              <option value="">Select attendee...</option>
              {attendees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-rise-black mb-1">Intent</label>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
            >
              <option value="">Select intent...</option>
              <option value="cold">Cold</option>
              <option value="neutral">Neutral</option>
              <option value="warm">Warm</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-rise-black mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Meeting notes..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none resize-y"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !selectedPartner || !notes.trim() || !intent}
            className="px-4 py-2 bg-rise-green text-white text-sm font-medium rounded-lg hover:bg-rise-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Save Conversation"}
          </button>
        </div>
      </form>
    </div>
  );
}
