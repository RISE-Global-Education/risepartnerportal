/**
 * Every table and column name the portal reads out of the RISE LMS database.
 *
 * Querying Supabase directly couples this repo to the LMS schema, so all of
 * that coupling is collected here: a renamed column is a one-line fix in this
 * file, not a hunt through the data layer. A wrong name surfaces at runtime as
 * a PostgREST error (42P01 unknown table / 42703 unknown column) thrown by
 * selectRows, naming the table.
 *
 * Every name below was verified against the live schema with
 * `node scripts/inspect-lms-schema.mjs` — re-run it after any LMS migration.
 */

export const TABLES = {
  programs: "programs",
  profiles: "profiles",
  meetings: "meetings",
  mentorFeedback: "mentor_feedback",
  wcFeedback: "wc_feedback",
  // review_feedback (the PM's note to the counselor) is deliberately not read —
  // the progress modal excludes it by design, not just in the UI filter.
  finalEvaluation: "final_evaluations",
} as const;

export const PROGRAMS = {
  id: "id", // text, not an integer
  studentId: "student_id", // uuid → profiles.id
  mentorId: "mentor_id", // uuid → profiles.id
  writingCoachId: "writing_coach_id", // uuid → profiles.id
  // The RISE counselor code, e.g. "PR12280" — the same value the portal holds
  // as Counselor ID in Airtable, and the safest link between the two systems.
  counselorId: "counselor_id",
  activeStudent: "active_student",
} as const;

export const PROFILES = {
  id: "id", // uuid
  fullName: "full_name",
} as const;

export const MEETINGS = {
  id: "id", // bigint
  programId: "program_id", // text → programs.id
  meetingType: "meeting_type", // meeting_type_enum
  meetingStatus: "meeting_status", // meeting_status_enum
  meetingNumber: "meeting_number",
  utcStart: "utc_start",
} as const;

/**
 * meeting_type_enum has four values, not the three the LMS integration notes
 * describe. M / WC / R are mentor, writing coach and review; L is undocumented
 * and is ignored rather than guessed at — unmapped types are dropped, so a new
 * enum value degrades to "not shown" instead of being mislabelled.
 */
export const MEETING_STATUS = {
  scheduled: "Scheduled",
  completed: "Completed",
  missed: "Missed",
  invalid: "Invalid",
} as const;

/** Columns common to the mentor and writing-coach feedback tables. */
export const FEEDBACK = {
  id: "id",
  meetingId: "meeting_id",
  attended: "attended",
  isOnTrack: "is_on_track", // nullable; null means unknown, not "off track"
  progressStage: "progress_stage",
  classNotes: "class_notes",
  keyTasks: "key_tasks",
  summary: "summary", // rendered as "Observations"
  createdAt: "created_at",
} as const;

/**
 * Staff-facing feedback columns, listed here so they are recognisable as
 * deliberate omissions. The progress modal is partner-facing, so these are
 * never selected:
 *
 *   handoff_note_for_wc, extra_support, flagged_status, steps_taken_offtrack,
 *   mentor_key_points, mentor_tasks, wc_key_points, wc_tasks
 */

export const FINAL_EVALUATION = {
  id: "id",
  // final_evaluations carries the program id directly, so it is reached without
  // going through the meeting that the evaluation replaces.
  programId: "program_id",
  meetingId: "meeting_id",
  attended: "attended",
  researchField: "research_field",
  projectTitle: "project_title",
  finalGrade: "final_grade",
  overallEvaluation: "overall_evaluation",
  performanceSummary: "performance_summary",
  metrics: "metrics", // jsonb: [{ n, label, rating, feedback }]
  recommendation: "recommendation",
  mentorComment: "mentor_comment",
  academicInstitution: "academic_institution",
  department: "department",
  submittedOn: "submitted_on",
} as const;
