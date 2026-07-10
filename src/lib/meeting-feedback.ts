import { fetchAllRecords, getField } from "./airtable";

const FEEDBACK_BASE = "appTEjth26azczzBC";
const MENTOR_TABLE = "tblLMvH5en6z7vF9T";
const WRITING_COACH_TABLE = "tbltv0FAIDvdRPgOR";
const REVIEW_MEET_TABLE = "tblELycUBAImsIHR6";

const PROGRESS_STAGE_FIELD =
  "Please select the student's progress stage (e.g., topic refinement, data collection, analysis, writing, etc.)";
const OBSERVATIONS_FIELD =
  "Provide your observations on the student’s progress, strengths, and areas for improvement. (This feedback is for internal reference only)";
const COUNSELLOR_MESSAGE_FIELD = "Write your message that you want the counsellor to know";

export type FeedbackSource = "Mentor" | "Writing Coach" | "Review Meet";

export interface MeetingFeedback {
  id: string;
  source: FeedbackSource;
  authorLabel: string | null;
  date: string; // ISO timestamp
  meetingNumber: number | null;
  progressStage: string | null;
  onTrack: string | null;
  attended: string | null;
  summary: string;
}

async function fetchFeedbackFromTable(
  tableId: string,
  source: FeedbackSource,
  studentName: string,
  attendedField: string,
  authorField: string,
  feedbackField: string
): Promise<MeetingFeedback[]> {
  const escapedName = studentName.trim().replace(/"/g, '\\"');
  const records = await fetchAllRecords(FEEDBACK_BASE, tableId, {
    filterByFormula: `AND(LOWER(TRIM({Student Name 2})) = LOWER("${escapedName}"), {${feedbackField}} != "")`,
  });

  const feedback = records.map((record) => ({
    id: record.id,
    source,
    authorLabel: getField<string>(record, authorField),
    date: getField<string>(record, "Created Time") || record.createdTime,
    meetingNumber: getField<number>(record, "Meeting Number"),
    progressStage: getField<string>(record, PROGRESS_STAGE_FIELD),
    onTrack: getField<string>(record, "Is the student on track to complete by the expected date?"),
    attended: getField<string>(record, attendedField),
    summary: getField<string>(record, feedbackField)!,
  }));

  feedback.sort((a, b) => (a.meetingNumber ?? 0) - (b.meetingNumber ?? 0));

  return feedback;
}

export async function getMeetingFeedbackForStudent(
  studentName: string
): Promise<MeetingFeedback[]> {
  if (!studentName) return [];

  const [mentor, writingCoach, review] = await Promise.all([
    fetchFeedbackFromTable(
      MENTOR_TABLE,
      "Mentor",
      studentName,
      "Did the student attended the session?",
      "Mentor Name 2",
      OBSERVATIONS_FIELD
    ),
    fetchFeedbackFromTable(
      WRITING_COACH_TABLE,
      "Writing Coach",
      studentName,
      "Did the student attended the session",
      "Writing Coach Email ID",
      OBSERVATIONS_FIELD
    ),
    fetchFeedbackFromTable(
      REVIEW_MEET_TABLE,
      "Review Meet",
      studentName,
      "Did the student attend the session?",
      "Program Manager Email ID",
      COUNSELLOR_MESSAGE_FIELD
    ),
  ]);

  return [...mentor, ...writingCoach, ...review];
}
