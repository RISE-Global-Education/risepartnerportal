"use client";

import { useState, useEffect } from "react";
import type { Conversation } from "@/lib/types";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function ConversationItem({
  conv,
  secret,
  attendees,
}: {
  conv: Conversation;
  secret: string;
  attendees: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(conv.date);
  const [notes, setNotes] = useState(conv.notes);
  const [attendee, setAttendee] = useState(conv.attendee);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, recordId: conv.id, date, notes, attendee }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDate(conv.date);
    setNotes(conv.notes);
    setAttendee(conv.attendee);
    setError("");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="px-6 py-4 bg-rise-cream/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-rise-black mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-rise-black mb-1">Attendee</label>
            <select
              value={attendee}
              onChange={(e) => setAttendee(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
            >
              <option value="">No attendee</option>
              {attendees.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-medium text-rise-black mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none resize-y"
          />
        </div>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-rise-green text-white text-xs font-medium rounded-lg hover:bg-rise-green/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs text-rise-brown hover:text-rise-black transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 group">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-medium text-rise-black">{formatDate(date)}</span>
        {attendee && (
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rise-cream text-rise-brown">
            {attendee}
          </span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-rise-brown hover:text-rise-black"
          title="Edit conversation"
        >
          <PencilIcon />
        </button>
      </div>
      {notes && (
        <p className="text-sm text-rise-black/80 whitespace-pre-wrap leading-relaxed">{notes}</p>
      )}
    </div>
  );
}

export default function ConversationLog({
  conversations,
  secret,
}: {
  conversations: Conversation[];
  secret: string;
}) {
  const [attendees, setAttendees] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/attendees")
      .then((r) => r.json())
      .then((data) => setAttendees(data.attendees ?? []));
  }, []);

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-rise-brown mt-8">
        No conversations logged yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-rise-black font-heading">
          Conversation History
        </h2>
        <p className="text-sm text-rise-brown mt-1">
          Internal — not visible to the partner
        </p>
      </div>
      <div className="divide-y divide-gray-50">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conv={conv}
            secret={secret}
            attendees={attendees}
          />
        ))}
      </div>
    </div>
  );
}
