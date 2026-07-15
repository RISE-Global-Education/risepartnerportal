import { fetchAllRecords, getField } from "./airtable";
import type { FeedbackSource } from "./meeting-feedback";

const SCHEDULE_BASE = "appTEjth26azczzBC";
const SCHEDULE_TABLE = "tbl45LaPG4RqbXIjh";

const MEETING_TYPE_SOURCE: Record<string, FeedbackSource> = {
  M: "Mentor",
  WC: "Writing Coach",
  R: "Review Meet",
};

export interface UpcomingSession {
  id: string;
  source: FeedbackSource;
  programId: string | null;
  meetingNumber: number | null;
  startDateTime: string; // ISO
}

export async function getUpcomingSessionsForStudent(
  studentEmail: string
): Promise<UpcomingSession[]> {
  if (!studentEmail) return [];

  const escapedEmail = studentEmail.trim().replace(/"/g, '\\"');
  const records = await fetchAllRecords(SCHEDULE_BASE, SCHEDULE_TABLE, {
    filterByFormula: `AND(LOWER(TRIM({Student Email})) = LOWER("${escapedEmail}"), {Meeting Status} = "", IS_AFTER({UTC Start DateTime}, NOW()))`,
  });

  const sessions = records
    .map((record) => {
      const meetingType = getField<string>(record, "Meeting Type");
      const source = meetingType ? MEETING_TYPE_SOURCE[meetingType] : null;
      const startDateTime = getField<string>(record, "UTC Start DateTime");
      if (!source || !startDateTime) return null;

      return {
        id: record.id,
        source,
        programId: getField<string>(record, "Program ID"),
        meetingNumber: getField<number>(record, "Meeting Number"),
        startDateTime,
      };
    })
    .filter((s): s is UpcomingSession => s !== null);

  sessions.sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

  return sessions;
}
