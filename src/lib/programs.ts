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
 */
export async function findProgramForStudent(
  counselorId: string,
  studentName: string
): Promise<Program | null> {
  if (!counselorId.trim() || !studentName.trim()) return null;
  const target = normalizeName(studentName);
  const nameMatches = `${normalizedNameSql(`sp.${PROFILES.fullName}`)} = $1`;

  // An active program wins when a student has re-enrolled.
  const scoped = await query<ProgramRow>(
    "program-lookup",
    `${SELECT_PROGRAM}
      WHERE ${nameMatches} AND p.${PROGRAMS.counselorId} = $2
      ORDER BY p.${PROGRAMS.activeStudent} DESC
      LIMIT 1`,
    [target, counselorId]
  );

  return scoped.length > 0 ? toProgram(scoped[0]) : null;
}
