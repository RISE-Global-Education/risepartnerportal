import { fetchAllRecords, getField } from "./airtable";

const FEEDBACK_BASE = "appTEjth26azczzBC";
const MENTOR_TABLE = "tblLMvH5en6z7vF9T";
const WRITING_COACH_TABLE = "tbltv0FAIDvdRPgOR";
const REVIEW_MEET_TABLE = "tblELycUBAImsIHR6";

const PROGRESS_STAGE_FIELD =
  "Please select the student's progress stage (e.g., topic refinement, data collection, analysis, writing, etc.)";
const ON_TRACK_FIELD = "Is the student on track to complete by the expected date?";
const CLASS_NOTES_FIELD =
  "Attach any relevant class notes or reference materials shared with the student (e.g., Google Drive links)";
const OBSERVATIONS_FIELD =
  "Provide your observations on the student’s progress, strengths, and areas for improvement. (This feedback is for internal reference only)";
const COUNSELLOR_MESSAGE_FIELD = "Write your message that you want the counsellor to know";
// Trailing whitespace is part of the Airtable field name — do not trim.
const NEXT_WEEK_TASKS_FIELD =
  "List the key tasks or goals recommended for the student in the coming week (max 3 lines)  ";

export type FeedbackSource = "Mentor" | "Writing Coach" | "Review Meet";

export interface MeetingFeedback {
  id: string;
  source: FeedbackSource;
  programId: string | null;
  date: string; // ISO timestamp
  meetingNumber: number | null;
  progressStage: string | null;
  onTrack: string | null;
  attended: string | null;
  classNotes: string | null;
  nextWeekTasks: string | null;
  summary: string;
}

// The three feedback forms do not share a schema — field names differ, and some
// fields only exist on one or two of the tables. A null field name means the
// column does not exist on that table, so the value stays null.
interface SourceConfig {
  tableId: string;
  source: FeedbackSource;
  programIdField: string;
  summaryField: string;
  attendedField: string;
  progressStageField: string | null;
  onTrackField: string | null;
  classNotesField: string | null;
  nextWeekTasksField: string | null;
}

const SOURCE_CONFIGS: SourceConfig[] = [
  {
    tableId: MENTOR_TABLE,
    source: "Mentor",
    programIdField: "Program ID.",
    summaryField: OBSERVATIONS_FIELD,
    attendedField: "Did the student attended the session?",
    progressStageField: null,
    onTrackField: null,
    classNotesField: CLASS_NOTES_FIELD,
    nextWeekTasksField: null,
  },
  {
    tableId: WRITING_COACH_TABLE,
    source: "Writing Coach",
    programIdField: "Program ID 2",
    summaryField: OBSERVATIONS_FIELD,
    attendedField: "Did the student attended the session",
    progressStageField: PROGRESS_STAGE_FIELD,
    onTrackField: ON_TRACK_FIELD,
    classNotesField: CLASS_NOTES_FIELD,
    nextWeekTasksField: NEXT_WEEK_TASKS_FIELD,
  },
  {
    tableId: REVIEW_MEET_TABLE,
    source: "Review Meet",
    programIdField: "Program ID 2",
    summaryField: COUNSELLOR_MESSAGE_FIELD,
    attendedField: "Did the student attend the session?",
    progressStageField: PROGRESS_STAGE_FIELD,
    onTrackField: ON_TRACK_FIELD,
    classNotesField: null,
    nextWeekTasksField: null,
  },
];

function optionalField(
  record: Parameters<typeof getField>[0],
  fieldName: string | null
): string | null {
  if (!fieldName) return null;
  const value = getField<string>(record, fieldName);
  return value?.trim() ? value : null;
}

async function fetchFeedbackFromTable(
  config: SourceConfig,
  studentName: string
): Promise<MeetingFeedback[]> {
  const escapedName = studentName.trim().replace(/"/g, '\\"');
  const records = await fetchAllRecords(FEEDBACK_BASE, config.tableId, {
    filterByFormula: `AND(LOWER(TRIM({Student Name 2})) = LOWER("${escapedName}"), {${config.summaryField}} != "")`,
  });

  const feedback = records.map((record) => ({
    id: record.id,
    source: config.source,
    programId: getField<string>(record, config.programIdField),
    date: getField<string>(record, "Created Time") || record.createdTime,
    meetingNumber: getField<number>(record, "Meeting Number"),
    progressStage: optionalField(record, config.progressStageField),
    onTrack: optionalField(record, config.onTrackField),
    attended: optionalField(record, config.attendedField),
    classNotes: optionalField(record, config.classNotesField),
    nextWeekTasks: optionalField(record, config.nextWeekTasksField),
    summary: getField<string>(record, config.summaryField)!,
  }));

  feedback.sort((a, b) => (a.meetingNumber ?? 0) - (b.meetingNumber ?? 0));

  return feedback;
}

export async function getMeetingFeedbackForStudent(
  studentName: string
): Promise<MeetingFeedback[]> {
  if (!studentName) return [];

  const perSource = await Promise.all(
    SOURCE_CONFIGS.map((config) => fetchFeedbackFromTable(config, studentName))
  );

  return perSource.flat();
}
