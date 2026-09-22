import { NextRequest, NextResponse } from "next/server";
import { getCounselorBySlug } from "@/lib/counselors";
import { getStudentsForCounselor } from "@/lib/students";
import { getProgramFeedback } from "@/lib/meeting-feedback";
import { getUpcomingSessionsForProgram } from "@/lib/upcoming-sessions";
import { findProgramForStudent } from "@/lib/programs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const studentId = searchParams.get("studentId");

  if (!slug || !studentId) {
    return NextResponse.json({ error: "slug and studentId are required" }, { status: 400 });
  }

  const result = await getCounselorBySlug(slug);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The student must belong to the counselor behind this slug. This is the
  // authorization check for the whole route — the LMS connection authenticates
  // as the table owner and so enforces nothing itself. It stays ahead of every
  // data call below.
  const students = await getStudentsForCounselor(result.counselor.counselorId);
  const student = students.find((s) => s.id === studentId);
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The pipeline record knows the student by name; the LMS keys everything off
  // its own program id. A student who has not been enrolled yet has no program,
  // which is an empty progress view rather than an error.
  const program = await findProgramForStudent(result.counselor.counselorId, student.name);
  if (!program) {
    return NextResponse.json({
      feedback: [],
      finalEvaluation: null,
      upcomingSessions: [],
      programTeam: null,
    });
  }

  const [{ feedback, finalEvaluation }, upcomingSessions] = await Promise.all([
    getProgramFeedback(program.programId),
    getUpcomingSessionsForProgram(program.programId),
  ]);

  return NextResponse.json({
    feedback,
    finalEvaluation,
    upcomingSessions,
    programTeam: {
      mentorName: program.mentorName,
      writingCoachName: program.writingCoachName,
    },
  });
}
