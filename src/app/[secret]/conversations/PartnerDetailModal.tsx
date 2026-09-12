"use client";

import { useEffect } from "react";
import type { Conversation, ConversationIntent } from "@/lib/types";

const INTENT_COLORS: Record<ConversationIntent, string> = {
  cold: "#3b82f6",
  neutral: "#f59e0b",
  warm: "#10b981",
};

const INTENT_LABELS: Record<ConversationIntent, string> = {
  cold: "Cold",
  neutral: "Neutral",
  warm: "Warm",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export interface PartnerDetail {
  companyName: string;
  conversations: Conversation[];
  latestIntent: ConversationIntent | null;
  latestDate: string;
}

export default function PartnerDetailModal({
  partner,
  onClose,
}: {
  partner: PartnerDetail;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const counts: Record<ConversationIntent, number> = { cold: 0, neutral: 0, warm: 0 };
  for (const c of partner.conversations) if (c.intent) counts[c.intent]++;

  const history = [...partner.conversations].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const journey = partner.conversations.filter((c) => c.intent);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-rise-black font-heading">
              {partner.companyName}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              {partner.latestIntent ? (
                <span
                  className="px-2 py-0.5 text-xs font-medium rounded-md text-white"
                  style={{ backgroundColor: INTENT_COLORS[partner.latestIntent] }}
                >
                  {INTENT_LABELS[partner.latestIntent]}
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-rise-brown">
                  No intent
                </span>
              )}
              <span className="text-xs text-rise-brown">
                Last contact {formatDate(partner.latestDate)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-rise-brown hover:text-rise-black transition-colors p-1"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <p className="text-lg font-bold text-rise-black">{partner.conversations.length}</p>
              <p className="text-[11px] text-rise-brown uppercase tracking-wide">Total</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: INTENT_COLORS.warm }}>
                {counts.warm}
              </p>
              <p className="text-[11px] text-rise-brown uppercase tracking-wide">Warm</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: INTENT_COLORS.neutral }}>
                {counts.neutral}
              </p>
              <p className="text-[11px] text-rise-brown uppercase tracking-wide">Neutral</p>
            </div>
            <div>
              <p className="text-lg font-bold" style={{ color: INTENT_COLORS.cold }}>
                {counts.cold}
              </p>
              <p className="text-[11px] text-rise-brown uppercase tracking-wide">Cold</p>
            </div>
          </div>

          {journey.length > 0 && (
            <div className="flex items-center gap-1 mt-4 flex-wrap">
              {journey.map((c, i) => (
                <span
                  key={c.id}
                  title={`${INTENT_LABELS[c.intent!]} · ${formatDate(c.date)}`}
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: INTENT_COLORS[c.intent!],
                    opacity: 0.5 + (0.5 * (i + 1)) / journey.length,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto px-6 py-4">
          <h3 className="text-sm font-semibold text-rise-black mb-3">Conversation History</h3>
          {history.length === 0 ? (
            <p className="text-sm text-rise-brown">No conversations logged yet.</p>
          ) : (
            <div className="space-y-4">
              {history.map((c) => (
                <div key={c.id} className="flex items-start gap-3">
                  {c.intent ? (
                    <span
                      className="mt-0.5 shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-md text-white"
                      style={{ backgroundColor: INTENT_COLORS[c.intent] }}
                    >
                      {INTENT_LABELS[c.intent]}
                    </span>
                  ) : (
                    <span className="mt-0.5 shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-md bg-gray-100 text-rise-brown">
                      —
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-rise-black">
                        {formatDate(c.date)}
                      </span>
                      {c.attendee && (
                        <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-rise-cream text-rise-brown">
                          {c.attendee}
                        </span>
                      )}
                    </div>
                    {c.notes && (
                      <p className="text-sm text-rise-black/80 mt-1 whitespace-pre-wrap leading-relaxed">
                        {c.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
