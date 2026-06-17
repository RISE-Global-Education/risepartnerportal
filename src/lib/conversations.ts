import { fetchAllRecords, getField } from "./airtable";
import type { Conversation } from "./types";

const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";
const CONVERSATIONS_TABLE = "tblIg6bBDbLvsvPiJ";

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

    conversations.push({
      id: record.id,
      date: getField<string>(record, "Date") || "",
      notes: getField<string>(record, "Notes") || "",
      attendee: getField<string>(record, "Attendee") || "",
      companyName: getField<string>(record, "Title") || "",
    });
  }

  // Sort chronologically (newest first)
  conversations.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return conversations;
}
