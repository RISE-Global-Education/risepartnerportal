import { fetchAllRecords, getField } from "./airtable";
import { getAllCounselors } from "./counselors";
import type { Conversation, ConversationIntent } from "./types";

const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";
const CONVERSATIONS_TABLE = "tblIg6bBDbLvsvPiJ";

const INTENT_VALUES: ConversationIntent[] = ["cold", "neutral", "warm"];

// AddConversationForm writes intent as a "Cold\nNotes: ..." prefix on the
// Notes field (there's no dedicated Airtable column for it) — parse it back
// out here rather than duplicating that format elsewhere.
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

export async function getConversationsForCounselor(
  counselorRecordId: string
): Promise<Conversation[]> {
  // Guard: without a record ID we must return nothing, never everything.
  if (!counselorRecordId) return [];

  const records = await fetchAllRecords(
    COUNSELOR_DB_BASE,
    CONVERSATIONS_TABLE,
    {
      fields: ["Title", "Date", "Notes", "Attendee", "Counselor"],
    }
  );

  const conversations: Conversation[] = [];

  for (const record of records) {
    // The REST API returns the linked "Counselor" field as an array of
    // record IDs. Match exactly to prevent cross-company leakage — a
    // substring FIND() in filterByFormula matches blank/overlapping IDs.
    const linkedCounselors = getField<string[]>(record, "Counselor") || [];
    if (!linkedCounselors.includes(counselorRecordId)) continue;

    const { intent, notes } = parseIntent(getField<string>(record, "Notes") || "");

    conversations.push({
      id: record.id,
      date: getField<string>(record, "Date") || "",
      notes,
      attendee: getField<string>(record, "Attendee") || "",
      companyName: getField<string>(record, "Title") || "",
      intent,
    });
  }

  // Sort chronologically (newest first)
  conversations.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return conversations;
}

export async function getAllConversations(): Promise<Conversation[]> {
  const [records, counselors] = await Promise.all([
    fetchAllRecords(COUNSELOR_DB_BASE, CONVERSATIONS_TABLE, {
      fields: ["Title", "Date", "Notes", "Attendee", "Counselor"],
    }),
    getAllCounselors(),
  ]);

  const counselorById = new Map(counselors.map((c) => [c.id, c]));

  const conversations: Conversation[] = [];

  for (const record of records) {
    const linkedCounselors = getField<string[]>(record, "Counselor") || [];
    const counselorRecordId = linkedCounselors[0];
    if (!counselorRecordId) continue;

    const counselor = counselorById.get(counselorRecordId);
    // Conversations linked to a counselor no longer in the directory
    // (deleted/archived) have nothing meaningful to show on the dashboard.
    if (!counselor) continue;

    const { intent, notes } = parseIntent(getField<string>(record, "Notes") || "");

    conversations.push({
      id: record.id,
      date: getField<string>(record, "Date") || "",
      notes,
      attendee: getField<string>(record, "Attendee") || "",
      companyName: counselor.companyName,
      intent,
      counselorRecordId,
      counselorName: counselor.companyName,
    });
  }

  conversations.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return conversations;
}
