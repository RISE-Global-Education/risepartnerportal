import { query, toBool, toIso, toStr } from "./lms-db";
import { FEEDBACK, FINAL_EVALUATION, MEETINGS, TABLES } from "./lms-schema";

export type FeedbackSource = "Mentor" | "Writing Coach";

/**
 * One session's feedback as the partner portal is allowed to see it.
 *
 * The staff-facing columns (handoff_note_for_wc, extra_support, flagged_status,
 * steps_taken_offtrack, mentor_key_points, mentor_tasks, wc_key_points,
 * wc_tasks) are never selected, so they cannot reach a counselor's browser.
 */
export interface MeetingFeedback {
  id: string;
  source: FeedbackSource;
  meetingId: number | null;
  date: string; // ISO timestamp of the session itself
  meetingNumber: number | null;
  progressStage: string | null;
  onTrack: boolean | null;
  attended: boolean | null;
  classNotes: string | null;
  nextWeekTasks: string | null;
  summary: string;
}

export interface EvaluationMetric {
  n: number;
  label: string;
  rating: string;
  feedback: string;
}

/**
 * The structured report filed against a program's final mentor session in place
 * of ordinary mentor feedback, in its own table.
 */
export interface FinalEvaluation {
  id: string;
  meetingId: number | null;
  date: string;
  meetingNumber: number | null;
  attended: boolean | null;
  researchField: string | null;
  projectTitle: string | null;
  finalGrade: string | null;
  overallEvaluation: string | null;
  performanceSummary: string | null;
  metrics: EvaluationMetric[];
  recommendation: string | null;
  mentorComment: string | null;
  academicInstitution: string | null;
  department: string | null;
}

export interface ProgramFeedback {
  feedback: MeetingFeedback[];
  finalEvaluation: FinalEvaluation | null;
}

interface FeedbackRow {
  source: FeedbackSource;
  id: string | number;
  meeting_id: string | number | null;
  attended: boolean | null;
  is_on_track: boolean | null;
  progress_stage: string | null;
  body: string | null;
  class_notes: string | null;
  key_tasks: string | null;
  created_at: Date | string | null;
  utc_start: Date | string | null;
}

/**
 * Both feedback tables for a program, in one round trip.
 *
 * Review Meet (the PM's note, filed in review_feedback) is deliberately not
 * queried at all — it is excluded from this partner-facing view by design, not
 * merely hidden in the filter, so it costs nothing and can never leak into
 * "All sessions".
 *
 * A record's kind comes from the TABLE it sits in, never from the meeting's
 * `meeting_type`: `meeting_type` only ever takes M and WC in this database, so
 * classifying by meeting type would misfile everything.
 *
 * A meeting legitimately carries records in both tables (mentor observations
 * and coach observations are distinct records, not duplicate filings), so
 * every row is kept and nothing is deduplicated.
 */
const FEEDBACK_SQL = `
  SELECT 'Mentor' AS source, f.${FEEDBACK.id} AS id, f.${FEEDBACK.meetingId} AS meeting_id,
         f.${FEEDBACK.attended} AS attended, f.${FEEDBACK.isOnTrack} AS is_on_track,
         f.${FEEDBACK.progressStage} AS progress_stage, f.${FEEDBACK.summary} AS body,
         f.${FEEDBACK.classNotes} AS class_notes, f.${FEEDBACK.keyTasks} AS key_tasks,
         f.${FEEDBACK.createdAt} AS created_at, m.${MEETINGS.utcStart} AS utc_start
    FROM ${TABLES.mentorFeedback} f
    JOIN ${TABLES.meetings} m ON m.${MEETINGS.id} = f.${FEEDBACK.meetingId}
   WHERE m.${MEETINGS.programId} = $1
  UNION ALL
  SELECT 'Writing Coach', f.${FEEDBACK.id}, f.${FEEDBACK.meetingId},
         f.${FEEDBACK.attended}, f.${FEEDBACK.isOnTrack},
         f.${FEEDBACK.progressStage}, f.${FEEDBACK.summary},
         f.${FEEDBACK.classNotes}, f.${FEEDBACK.keyTasks},
         f.${FEEDBACK.createdAt}, m.${MEETINGS.utcStart}
    FROM ${TABLES.wcFeedback} f
    JOIN ${TABLES.meetings} m ON m.${MEETINGS.id} = f.${FEEDBACK.meetingId}
   WHERE m.${MEETINGS.programId} = $1`;

function toMeetingFeedback(row: FeedbackRow): MeetingFeedback | null {
  const summary = toStr(row.body);
  if (!summary) return null;

  return {
    id: `${row.source}-${row.id}`,
    source: row.source,
    meetingId: row.meeting_id === null ? null : Number(row.meeting_id),
    date: toIso(row.utc_start) ?? toIso(row.created_at) ?? "",
    meetingNumber: null, // assigned per source once the full set is known
    progressStage: toStr(row.progress_stage),
    onTrack: toBool(row.is_on_track),
    attended: toBool(row.attended),
    classNotes: toStr(row.class_notes),
    nextWeekTasks: toStr(row.key_tasks),
    summary,
  };
}

/**
 * Numbers each source's sessions 1..n by date.
 *
 * The meeting's own `meeting_number` cannot be used: numbering runs per meeting
 * type, and feedback is routinely filed against a slot of the other type, so two
 * mentor sessions can land on meetings that share a number and both render as
 * "Mentor Session 3". Counting each source's own records in date order gives a
 * counselor the sequence they expect and cannot collide.
 */
function assignSessionNumbers(feedback: MeetingFeedback[]): MeetingFeedback[] {
  const counters = new Map<FeedbackSource, number>();

  return [...feedback]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((entry) => {
      const next = (counters.get(entry.source) ?? 0) + 1;
      counters.set(entry.source, next);
      return { ...entry, meetingNumber: next };
    });
}

interface FinalEvaluationRow {
  id: string | number;
  meeting_id: string | number | null;
  attended: boolean | null;
  research_field: string | null;
  project_title: string | null;
  final_grade: string | null;
  overall_evaluation: string | null;
  performance_summary: string | null;
  metrics: unknown;
  recommendation: string | null;
  mentor_comment: string | null;
  academic_institution: string | null;
  department: string | null;
  submitted_on: Date | string | null;
  utc_start: Date | string | null;
}

// The final mentor session files a structured evaluation instead of a
// mentor_feedback row, so without this the closing session of every completed
// program is missing from the list. final_evaluations carries program_id
// directly, so it is fetched by program rather than by hunting for gaps.
async function findFinalEvaluation(programId: string): Promise<FinalEvaluation | null> {
  // A supplementary lookup — if it fails, the ordinary session feedback has
  // already loaded and should still be shown.
  let rows: FinalEvaluationRow[];
  try {
    rows = await query<FinalEvaluationRow>(
      "final-evaluation",
      `SELECT fe.${FINAL_EVALUATION.id} AS id, fe.${FINAL_EVALUATION.meetingId} AS meeting_id,
              fe.${FINAL_EVALUATION.attended} AS attended,
              fe.${FINAL_EVALUATION.researchField} AS research_field,
              fe.${FINAL_EVALUATION.projectTitle} AS project_title,
              fe.${FINAL_EVALUATION.finalGrade} AS final_grade,
              fe.${FINAL_EVALUATION.overallEvaluation} AS overall_evaluation,
              fe.${FINAL_EVALUATION.performanceSummary} AS performance_summary,
              fe.${FINAL_EVALUATION.metrics} AS metrics,
              fe.${FINAL_EVALUATION.recommendation} AS recommendation,
              fe.${FINAL_EVALUATION.mentorComment} AS mentor_comment,
              fe.${FINAL_EVALUATION.academicInstitution} AS academic_institution,
              fe.${FINAL_EVALUATION.department} AS department,
              fe.${FINAL_EVALUATION.submittedOn} AS submitted_on,
              m.${MEETINGS.utcStart} AS utc_start
         FROM ${TABLES.finalEvaluation} fe
         LEFT JOIN ${TABLES.meetings} m ON m.${MEETINGS.id} = fe.${FINAL_EVALUATION.meetingId}
        WHERE fe.${FINAL_EVALUATION.programId} = $1
        ORDER BY fe.${FINAL_EVALUATION.submittedOn} DESC
        LIMIT 1`,
      [programId]
    );
  } catch (err) {
    console.error("[LMS] Final evaluation lookup failed — check lms-schema.ts:", err);
    return null;
  }

  const row = rows[0];
  if (!row) return null;

  return {
    id: `final-evaluation-${row.id}`,
    meetingId: row.meeting_id === null ? null : Number(row.meeting_id),
    // Prefer the session's own date, falling back to when the evaluation was
    // filed if the meeting it replaced is no longer on the program.
    date: toIso(row.utc_start) ?? toIso(row.submitted_on) ?? "",
    meetingNumber: null,
    attended: toBool(row.attended),
    researchField: toStr(row.research_field),
    projectTitle: toStr(row.project_title),
    finalGrade: toStr(row.final_grade),
    overallEvaluation: toStr(row.overall_evaluation),
    performanceSummary: toStr(row.performance_summary),
    metrics: Array.isArray(row.metrics) ? (row.metrics as EvaluationMetric[]) : [],
    recommendation: toStr(row.recommendation),
    mentorComment: toStr(row.mentor_comment),
    academicInstitution: toStr(row.academic_institution),
    department: toStr(row.department),
  };
}

export async function getProgramFeedback(programId: string): Promise<ProgramFeedback> {
  if (!programId) return { feedback: [], finalEvaluation: null };

  const [rows, finalEvaluation] = await Promise.all([
    query<FeedbackRow>("program-feedback", FEEDBACK_SQL, [programId]),
    findFinalEvaluation(programId),
  ]);

  const feedback = assignSessionNumbers(
    rows.map(toMeetingFeedback).filter((f): f is MeetingFeedback => f !== null)
  );

  // Preserve the portal's reading order: grouped by source, then by session.
  const order: FeedbackSource[] = ["Mentor", "Writing Coach"];
  feedback.sort(
    (a, b) =>
      order.indexOf(a.source) - order.indexOf(b.source) ||
      (a.meetingNumber ?? 0) - (b.meetingNumber ?? 0)
  );

  return { feedback, finalEvaluation };
}
