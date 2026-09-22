import { query, toIso } from "./lms-db";
import { MEETINGS, TABLES } from "./lms-schema";

// meeting_type_enum also contains "R" and "L", neither of which is used by any
// booking in this database — every meeting is M or WC. Unmapped types are
// dropped downstream, so a newly used value is simply not shown rather than
// mislabelled.
export type MeetingType = "M" | "WC" | "R";
export type MeetingStatus = "Scheduled" | "Completed" | "Missed" | "Invalid";

export interface ProgramMeeting {
  id: number;
  meetingType: MeetingType;
  utcStart: string;
  status: MeetingStatus;
}

interface MeetingRow {
  id: string | number;
  meeting_type: string | null;
  meeting_status: string | null;
  utc_start: Date | string | null;
}

/**
 * Every booking on a program, including sessions with no feedback yet — which
 * is what separates this from the feedback tables.
 */
export async function getProgramMeetings(programId: string): Promise<ProgramMeeting[]> {
  if (!programId) return [];

  const rows = await query<MeetingRow>(
    "program-meetings",
    `SELECT ${MEETINGS.id}             AS id,
            ${MEETINGS.meetingType}    AS meeting_type,
            ${MEETINGS.meetingStatus}  AS meeting_status,
            ${MEETINGS.utcStart}       AS utc_start
       FROM ${TABLES.meetings}
      WHERE ${MEETINGS.programId} = $1
      ORDER BY ${MEETINGS.utcStart}`,
    [programId]
  );

  return rows
    .map((row) => {
      const utcStart = toIso(row.utc_start);
      if (!utcStart || !row.meeting_type) return null;
      return {
        id: Number(row.id),
        meetingType: row.meeting_type as MeetingType,
        utcStart,
        status: (row.meeting_status ?? "Scheduled") as MeetingStatus,
      };
    })
    .filter((m): m is ProgramMeeting => m !== null);
}
