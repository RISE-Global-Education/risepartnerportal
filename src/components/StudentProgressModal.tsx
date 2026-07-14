"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { FunnelStage } from "@/lib/types";
import type { FeedbackSource, MeetingFeedback } from "@/lib/meeting-feedback";
import type { UpcomingSession } from "@/lib/upcoming-sessions";
import { STAGE_BADGE } from "./StudentTable";

const AUTHOR_LABEL: Record<FeedbackSource, string> = {
  Mentor: "Mentor",
  "Writing Coach": "Writing Coach",
  "Review Meet": "Program Manager",
};

type FilterValue = FeedbackSource | "All" | "Upcoming";

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "All sessions", value: "All" },
  { label: "Mentor", value: "Mentor" },
  { label: "Writing Coach", value: "Writing Coach" },
  { label: "Review Meet", value: "Review Meet" },
  { label: "Upcoming", value: "Upcoming" },
];

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function OnTrackBadge({ value }: { value: string | null }) {
  if (!value) return null;
  const isOnTrack = value.toLowerCase() === "yes";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        isOnTrack ? "bg-emerald-50 text-rise-green" : "bg-red-50 text-red-600"
      }`}
    >
      {isOnTrack ? "On track" : "Not on track"}
    </span>
  );
}

function FeedbackAccordionItem({ entry }: { entry: MeetingFeedback }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const title =
    entry.meetingNumber !== null ? `${entry.source} Session ${entry.meetingNumber}` : entry.source;

  useEffect(() => {
    if (open) {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [open]);

  return (
    <div ref={containerRef} className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-rise-cream/40 hover:bg-rise-cream/70 transition-colors text-left"
      >
        <span className="font-medium text-rise-black text-sm">{title}</span>
        <span className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-rise-brown">{formatDate(entry.date)}</span>
          <svg
            className={`w-4 h-4 text-rise-brown transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center flex-wrap gap-2 mb-3">
            {entry.progressStage && (
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                {entry.progressStage}
              </span>
            )}
            <OnTrackBadge value={entry.onTrack} />
            {entry.authorLabel && (
              <span className="text-xs text-rise-brown">
                {AUTHOR_LABEL[entry.source]}:{" "}
                <span className="font-medium text-rise-black">{entry.authorLabel}</span>
              </span>
            )}
          </div>
          <p className="text-sm text-rise-black/80 whitespace-pre-wrap leading-relaxed">
            {entry.summary}
          </p>
        </div>
      )}
    </div>
  );
}

function FilterDropdown({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = FILTER_OPTIONS.find((opt) => opt.value === value)?.label ?? "All sessions";

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-sm text-rise-black hover:border-rise-green transition-colors"
      >
        {selectedLabel}
        <svg
          className={`w-4 h-4 text-rise-brown transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 py-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                opt.value === value
                  ? "bg-rise-green/10 text-rise-green font-medium"
                  : "text-rise-black hover:bg-rise-cream/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UpcomingSessionRow({ session }: { session: UpcomingSession }) {
  const title =
    session.meetingNumber !== null ? `${session.source} Session ${session.meetingNumber}` : session.source;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border border-gray-200 rounded-lg">
      <div className="min-w-0">
        <span className="font-medium text-rise-black text-sm">{title}</span>
        {session.hostEmail && (
          <span className="block text-xs text-rise-brown truncate">{session.hostEmail}</span>
        )}
      </div>
      <span className="text-xs text-rise-brown shrink-0">{formatDateTime(session.startDateTime)}</span>
    </div>
  );
}

export default function StudentProgressModal({
  studentId,
  studentName,
  stage,
  partnerSlug,
  secret,
  onClose,
}: {
  studentId: string;
  studentName: string;
  stage: FunnelStage;
  partnerSlug: string;
  secret: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<MeetingFeedback[] | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[] | null>(null);
  const [filter, setFilter] = useState<FilterValue>("All");

  useEffect(() => {
    fetch(
      `/api/meeting-feedback?secret=${encodeURIComponent(secret)}&slug=${encodeURIComponent(partnerSlug)}&studentId=${encodeURIComponent(studentId)}`
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load feedback");
        const data = await res.json();
        setFeedback(data.feedback);
        setUpcomingSessions(data.upcomingSessions);
      })
      .catch(() => setError("Failed to load feedback. Please try again."))
      .finally(() => setLoading(false));
  }, [secret, partnerSlug, studentId]);

  const upcomingOnly = filter === "Upcoming";
  const isAll = filter === "All";

  const visibleFeedback = upcomingOnly
    ? []
    : feedback?.filter((f) => isAll || f.source === filter) ?? [];
  const visibleUpcomingInline = isAll ? upcomingSessions ?? [] : [];
  const visibleUpcomingOnly = upcomingOnly ? upcomingSessions ?? [] : [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-lg font-bold text-rise-black font-heading truncate">{studentName}</h2>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STAGE_BADGE[stage]}`}
            >
              {stage}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <FilterDropdown value={filter} onChange={setFilter} />
            <button
              type="button"
              onClick={onClose}
              className="text-rise-brown hover:text-rise-black p-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-2">
          {loading && <p className="text-sm text-rise-brown text-center py-8">Loading...</p>}
          {error && <p className="text-sm text-red-500 text-center py-8">{error}</p>}

          {!loading && !error && upcomingOnly && (
            visibleUpcomingOnly.length === 0 ? (
              <p className="text-sm text-rise-brown text-center py-8">
                No upcoming sessions scheduled.
              </p>
            ) : (
              visibleUpcomingOnly.map((session) => (
                <UpcomingSessionRow key={session.id} session={session} />
              ))
            )
          )}

          {!loading && !error && !upcomingOnly && (
            <>
              {feedback !== null && visibleFeedback.length === 0 && (
                <p className="text-sm text-rise-brown text-center py-8">
                  {feedback.length === 0 ? "No meeting feedback logged yet." : "No sessions match this filter."}
                </p>
              )}
              {visibleFeedback.map((entry) => (
                <FeedbackAccordionItem key={entry.id} entry={entry} />
              ))}

              {visibleUpcomingInline.length > 0 && (
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-rise-brown mb-2">Upcoming Sessions</p>
                  <div className="space-y-2">
                    {visibleUpcomingInline.map((session) => (
                      <UpcomingSessionRow key={session.id} session={session} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
