"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddConversationForm({
  counselorId,
  counselorName,
  secret,
}: {
  counselorId: string;
  counselorName: string;
  secret: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [attendee, setAttendee] = useState("");
  const [intent, setIntent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/attendees")
      .then((r) => r.json())
      .then((data) => setAttendees(data.attendees ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          counselorId,
          counselorName,
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

      setNotes("");
      setDate(new Date().toISOString().split("T")[0]);
      setAttendee("");
      setIntent("");
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
      <div className="mt-8">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-rise-green text-white text-sm font-medium rounded-lg hover:bg-rise-green/90 transition-colors"
        >
          + Add Conversation
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-rise-black font-heading">
          New Conversation
        </h2>
        <button
          onClick={() => setIsOpen(false)}
          className="text-sm text-rise-brown hover:text-rise-black"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-rise-black mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rise-black mb-1">
              Attendee
            </label>
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
            <label className="block text-sm font-medium text-rise-black mb-1">
              Intent
            </label>
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
            >
              <option value="">Select intent...</option>
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-rise-black mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Meeting notes..."
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none resize-y"
          />
        </div>
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !notes.trim() || !intent}
            className="px-4 py-2 bg-rise-green text-white text-sm font-medium rounded-lg hover:bg-rise-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Save Conversation"}
          </button>
        </div>
      </form>
    </div>
  );
}
