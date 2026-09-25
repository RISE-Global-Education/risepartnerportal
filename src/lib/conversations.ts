import { getAllCounselors } from "./counselors";
import { query, toIso, toStr } from "./lms-db";
import { COUNSELOR_CONVERSATIONS as CC } from "./supabase-schema";
import type { Conversation, ConversationIntent } from "./types";

const INTENT_VALUES: ConversationIntent[] = ["cold", "neutral", "warm"];

// AddConversationForm writes intent as a "Cold\nNotes: ..." prefix on the
// notes column (there's no dedicated column for it) — parse it back out
// here rather than duplicating that format elsewhere. Kept exactly as it
// worked when this table was Airtable-backed, so no schema change was
// needed to bring Conversations over to Supabase.
function parseIntent(rawNotes: string): {
  intent: ConversationIntent | null;
  notes: string;
} {
  const match = rawNotes.match(/^(Cold|Neutral|Warm)\n(?:Notes: )?([\s\S]*)$/);
  if (!match) return { intent: null, notes: rawNotes };
  const intent = match[1].toLowerCase() as ConversationIntent;
  if (!INTENT_VALUES.includes(intent)) return { intent: null, notes: rawNotes };
  return { intent, notes: match[2] };
}

interface ConversationRow {
  id: string;
  title: string | null;
  date: Date | string | null;
  notes: string | null;
  attendee: string | null;
}

function toConversation(row: ConversationRow): Omit<Conversation, "companyName"> & { companyName: string } {
  const { intent, notes } = parseIntent(toStr(row.notes) || "");
  return {
    id: row.id,
    date: toIso(row.date) || "",
    notes,
    attendee: toStr(row.attendee) || "",
    companyName: toStr(row.title) || "",
    intent,
  };
}

export async function getConversationsForCounselor(counselorId: string): Promise<Conversation[]> {
  // Guard: without a counselor id we must return nothing, never everything.
  if (!counselorId) return [];

  const rows = await query<ConversationRow>(
    "counselor-conversations",
    `SELECT ${CC.id}::text AS id, ${CC.title} AS title, ${CC.date} AS date,
            ${CC.notes} AS notes, ${CC.attendee} AS attendee
       FROM ${CC.table}
      WHERE ${CC.counselorId} = $1`,
    [counselorId]
  );

  const conversations = rows.map(toConversation);
  conversations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return conversations;
}

export async function getAllConversations(): Promise<Conversation[]> {
  const [rows, counselors] = await Promise.all([
    query<ConversationRow & { counselor_id: string | null }>(
      "counselor-conversations",
      `SELECT ${CC.id}::text AS id, ${CC.title} AS title, ${CC.date} AS date,
              ${CC.notes} AS notes, ${CC.attendee} AS attendee, ${CC.counselorId} AS counselor_id
         FROM ${CC.table}`
    ),
    getAllCounselors(),
  ]);

  const counselorByCounselorId = new Map(counselors.map((c) => [c.counselorId, c]));

  const conversations: Conversation[] = [];
  for (const row of rows) {
    if (!row.counselor_id) continue;
    const counselor = counselorByCounselorId.get(row.counselor_id);
    // Conversations linked to a counselor no longer in the directory
    // (deleted/archived) have nothing meaningful to show on the dashboard.
    if (!counselor) continue;

    const base = toConversation(row);
    conversations.push({
      ...base,
      companyName: counselor.companyName,
      counselorRecordId: row.counselor_id,
      counselorName: counselor.companyName,
    });
  }

  conversations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return conversations;
}
