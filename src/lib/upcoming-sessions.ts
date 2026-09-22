import { getProgramMeetings, type MeetingType } from "./program-meetings";
import type { FeedbackSource } from "./meeting-feedback";

// R (Review Meet) is deliberately absent: it is excluded from this
// partner-facing view by design, same as in meeting-feedback.ts. A Partial
// map (rather than Record<MeetingType, ...>) lets that meeting type fall
// through the `if (!source) return null` below instead of being shown.
const TYPE_TO_SOURCE: Partial<Record<MeetingType, FeedbackSource>> = {
  M: "Mentor",
  WC: "Writing Coach",
};

export interface UpcomingSession {
  id: string;
  source: FeedbackSource;
  startDateTime: string; // ISO, UTC
}

/**
 * Sessions that are still booked and have not happened yet.
 *
 * Filing feedback moves a meeting to Completed or Missed in the same
 * transaction, so "Scheduled" is exactly the set still outstanding. The start
 * time is checked too, since a session whose feedback is overdue stays
 * Scheduled until it is filed or the window lapses into Invalid.
 *
 * No session number is carried: the meeting's stored number is unreliable here
 * for the same reason it is for feedback (see assignSessionNumbers in
 * meeting-feedback.ts), and a future session has no place in a completed
 * sequence yet.
 */
export async function getUpcomingSessionsForProgram(
  programId: string
): Promise<UpcomingSession[]> {
  if (!programId) return [];

  const now = Date.now();
  const sessions = (await getProgramMeetings(programId))
    .filter((meeting) => meeting.status === "Scheduled")
    .filter((meeting) => new Date(meeting.utcStart).getTime() > now)
    .map((meeting): UpcomingSession | null => {
      const source = TYPE_TO_SOURCE[meeting.meetingType];
      if (!source) return null;
      return {
        id: String(meeting.id),
        source,
        startDateTime: meeting.utcStart,
      };
    })
    .filter((s): s is UpcomingSession => s !== null);

  sessions.sort(
    (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  );

  return sessions;
}
