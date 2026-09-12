"use client";

import { useMemo, useState } from "react";
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalDate(dateStr: string): Date {
  // Airtable dates are plain "YYYY-MM-DD" — parse as local, not UTC, so
  // conversations don't shift a day depending on the viewer's timezone.
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function CalendarWidget({
  conversations,
  defaultMonth,
  onSelectConversation,
}: {
  conversations: Conversation[];
  defaultMonth?: Date;
  onSelectConversation?: (conversation: Conversation) => void;
}) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const base = defaultMonth || new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, Conversation[]>();
    for (const c of conversations) {
      if (!c.date) continue;
      const key = dateKey(toLocalDate(c.date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [conversations]);

  const cells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const result: { date: Date | null; key: string | null }[] = [];
    for (let i = 0; i < startOffset; i++) result.push({ date: null, key: null });
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      result.push({ date, key: dateKey(date) });
    }
    return result;
  }, [monthCursor]);

  const todayKey = dateKey(new Date());
  const selectedConversations = selectedDate ? byDay.get(selectedDate) || [] : [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-rise-black">
          {monthCursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() =>
              setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
            }
            className="w-7 h-7 flex items-center justify-center rounded-lg text-rise-brown hover:bg-gray-100 hover:text-rise-black transition-colors"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              setSelectedDate(null);
            }}
            className="px-2.5 py-1 text-xs font-medium rounded-lg text-rise-brown hover:bg-gray-100 hover:text-rise-black transition-colors"
          >
            Today
          </button>
          <button
            onClick={() =>
              setMonthCursor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
            }
            className="w-7 h-7 flex items-center justify-center rounded-lg text-rise-brown hover:bg-gray-100 hover:text-rise-black transition-colors"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[11px] font-medium text-rise-brown uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (!cell.date) {
            return <div key={i} className="aspect-square border-b border-r border-gray-50" />;
          }
          const dayConvs = byDay.get(cell.key!) || [];
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDate;

          const counts: Record<ConversationIntent, number> = { cold: 0, neutral: 0, warm: 0 };
          for (const c of dayConvs) if (c.intent) counts[c.intent]++;

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(isSelected ? null : cell.key)}
              disabled={dayConvs.length === 0}
              className={`aspect-square border-b border-r border-gray-50 p-1.5 flex flex-col items-start gap-1 text-left transition-colors ${
                dayConvs.length > 0 ? "hover:bg-rise-cream/40 cursor-pointer" : "cursor-default"
              } ${isSelected ? "bg-rise-green/10 ring-1 ring-inset ring-rise-green" : ""}`}
            >
              <span
                className={`w-5 h-5 flex items-center justify-center text-xs rounded-full ${
                  isToday ? "bg-rise-green text-white font-semibold" : "text-rise-black"
                }`}
              >
                {cell.date.getDate()}
              </span>
              {dayConvs.length > 0 && (
                <div className="flex flex-wrap gap-0.5">
                  {(["cold", "neutral", "warm"] as ConversationIntent[]).map(
                    (intent) =>
                      counts[intent] > 0 && (
                        <span
                          key={intent}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: INTENT_COLORS[intent] }}
                        />
                      )
                  )}
                  {dayConvs.length > 3 && (
                    <span className="text-[9px] text-rise-brown leading-none">
                      {dayConvs.length}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="border-t border-gray-100 px-5 py-4">
          <h4 className="text-sm font-semibold text-rise-black mb-3">
            {toLocalDate(selectedDate).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h4>
          {selectedConversations.length === 0 ? (
            <p className="text-sm text-rise-brown">No conversations logged this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedConversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectConversation?.(c)}
                  className={`flex items-start gap-3 ${
                    onSelectConversation ? "cursor-pointer hover:bg-rise-cream/40 -mx-2 px-2 py-1 rounded-lg transition-colors" : ""
                  }`}
                >
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
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-rise-black">
                      {c.counselorName || c.companyName}
                      {c.attendee && (
                        <span className="font-normal text-rise-brown"> · {c.attendee}</span>
                      )}
                    </p>
                    {c.notes && (
                      <p className="text-xs text-rise-brown mt-0.5 line-clamp-2">{c.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
