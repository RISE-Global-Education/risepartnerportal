import { NextRequest, NextResponse } from "next/server";
import { getCounselorBySlug } from "@/lib/counselors";
import { getStudentsForCounselor } from "@/lib/students";
import { getMeetingFeedbackForStudent } from "@/lib/meeting-feedback";
import { getUpcomingSessionsForStudent } from "@/lib/upcoming-sessions";

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

  const students = await getStudentsForCounselor(result.counselor.counselorId);
  const student = students.find((s) => s.id === studentId);
  if (!student) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [feedback, upcomingSessions] = await Promise.all([
    getMeetingFeedbackForStudent(student.name),
    getUpcomingSessionsForStudent(student.email),
  ]);

  return NextResponse.json({ feedback, upcomingSessions });
}
