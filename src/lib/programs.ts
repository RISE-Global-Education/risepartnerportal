import { normalizeName, normalizedNameSql, query, toStr } from "./lms-db";
import { PROFILES, PROGRAMS, TABLES } from "./lms-schema";

export interface Program {
  programId: string;
  isActive: boolean;
  mentorName: string | null;
  writingCoachName: string | null;
}

interface ProgramRow {
  id: string;
  active_student: boolean;
  mentor_name: string | null;
  wc_name: string | null;
}

// The mentor and coach names are joined here rather than fetched separately —
// they hang off the same program row, so they cost nothing extra.
const SELECT_PROGRAM = `
  SELECT p.${PROGRAMS.id}             AS id,
         p.${PROGRAMS.activeStudent}  AS active_student,
         mp.${PROFILES.fullName}      AS mentor_name,
         wp.${PROFILES.fullName}      AS wc_name
    FROM ${TABLES.programs} p
    JOIN ${TABLES.profiles} sp ON sp.${PROFILES.id} = p.${PROGRAMS.studentId}
    LEFT JOIN ${TABLES.profiles} mp ON mp.${PROFILES.id} = p.${PROGRAMS.mentorId}
    LEFT JOIN ${TABLES.profiles} wp ON wp.${PROFILES.id} = p.${PROGRAMS.writingCoachId}`;

function toProgram(row: ProgramRow): Program {
  return {
    programId: String(row.id),
    isActive: row.active_student !== false,
    mentorName: toStr(row.mentor_name),
    writingCoachName: toStr(row.wc_name),
  };
}

/**
 * Finds the program belonging to one of a counselor's students.
 *
 * Matching is scoped to the counselor's own programs via `programs.counselor_id`
 * (the same "PR…" code the portal holds in Airtable) rather than searching every
 * student by name, so two students who share a name at different counselors can
 * never be confused for one another.
 *
 * Roughly one program in seven has no counselor_id recorded. For those the
 * lookup falls back to a name search that accepts only an unambiguous single
 * match — the caller has already verified this student belongs to this
 * counselor, so the risk being guarded against is attaching the wrong person's
 * progress, not unauthorized access.
 */
export async function findProgramForStudent(
  counselorId: string,
  studentName: string
): Promise<Program | null> {
  if (!studentName.trim()) return null;
  const target = normalizeName(studentName);
  const nameMatches = `${normalizedNameSql(`sp.${PROFILES.fullName}`)} = $1`;

  if (counselorId) {
    // An active program wins when a student has re-enrolled.
    const scoped = await query<ProgramRow>(
      "program-lookup",
      `${SELECT_PROGRAM}
        WHERE ${nameMatches} AND p.${PROGRAMS.counselorId} = $2
        ORDER BY p.${PROGRAMS.activeStudent} DESC
        LIMIT 1`,
      [target, counselorId]
    );
    if (scoped.length > 0) return toProgram(scoped[0]);
  }

  // Two rows back means the name is ambiguous and the right program cannot be
  // identified with confidence; showing the wrong student's progress is worse
  // than showing none.
  const unscoped = await query<ProgramRow>(
    "program-lookup",
    `${SELECT_PROGRAM}
      WHERE ${nameMatches}
      ORDER BY p.${PROGRAMS.activeStudent} DESC
      LIMIT 2`,
    [target]
  );

  return unscoped.length === 1 ? toProgram(unscoped[0]) : null;
}
