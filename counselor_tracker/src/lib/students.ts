import { fetchAllRecords, getField } from "./airtable";
import { getCounselorStudentLinks } from "./counselors";
import type { Student, FunnelStage } from "./types";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";

const APPLICATION_STATUSES = new Set([null, "", "SWA1", "SWA2", "SWA3", "Call Shortlisting"]);
const INTERVIEW_STATUSES = new Set(["Interview Completed", "AWA1", "AWA2", "AWA3", "Call Payment"]);
const CLIENT_STATUSES = new Set(["Client"]);

function getStageFromFollowUp(status: string | null): FunnelStage {
  if (!status || APPLICATION_STATUSES.has(status)) return "Application";
  if (INTERVIEW_STATUSES.has(status)) return "Interview";
  if (CLIENT_STATUSES.has(status)) return "Client";
  return "Application"; // default for unknown statuses
}

export async function getStudentsForCounselor(counselorId: string): Promise<Student[]> {
  const { discoveryCallIds, applicationIds } = await getCounselorStudentLinks(counselorId);
  const students: Student[] = [];

  // Fetch application students first (they take priority over discovery call)
  const applicationStudentEmails = new Set<string>();

  if (applicationIds.length > 0) {
    // Fetch in batches (Airtable formula has length limits)
    const batchSize = 20;
    for (let i = 0; i < applicationIds.length; i += batchSize) {
      const batch = applicationIds.slice(i, i + batchSize);
      const formula = `OR(${batch.map((id) => `RECORD_ID() = "${id}"`).join(",")})`;

      const records = await fetchAllRecords(
        STUDENT_PIPELINE_BASE,
        APPLICATION_TABLE,
        {
          fields: [
            "Name",
            "Student Email ID",
            "Follow Up Status",
            "Created",
            "Last Modified",
          ],
          filterByFormula: formula,
        }
      );

      for (const record of records) {
        const followUpStatus = getField<string>(record, "Follow Up Status");

        // Skip dropped students
        if (followUpStatus === "Drop") continue;

        const email = getField<string>(record, "Student Email ID") || "";
        if (email) applicationStudentEmails.add(email.toLowerCase());

        const stage = getStageFromFollowUp(followUpStatus);
        students.push({
          id: record.id,
          name: getField<string>(record, "Name") || "Unknown",
          email,
          stage,
          followUpStatus: followUpStatus || null,
          dateEntered: getField<string>(record, "Created") || record.createdTime,
          source: "application",
        });
      }
    }
  }

  // Fetch discovery call students (only those NOT in applications)
  if (discoveryCallIds.length > 0) {
    const batchSize = 20;
    for (let i = 0; i < discoveryCallIds.length; i += batchSize) {
      const batch = discoveryCallIds.slice(i, i + batchSize);
      const formula = `OR(${batch.map((id) => `RECORD_ID() = "${id}"`).join(",")})`;

      const records = await fetchAllRecords(
        STUDENT_PIPELINE_BASE,
        DISCOVERY_CALL_TABLE,
        {
          fields: [
            "Student Name",
            "Student Email ID",
            "Created",
          ],
          filterByFormula: formula,
        }
      );

      for (const record of records) {
        const email = getField<string>(record, "Student Email ID") || "";

        // Skip if this student is already in applications (furthest stage wins)
        if (email && applicationStudentEmails.has(email.toLowerCase())) continue;

        students.push({
          id: record.id,
          name: getField<string>(record, "Student Name") || "Unknown",
          email,
          stage: "Lead" as FunnelStage,
          followUpStatus: null,
          dateEntered: getField<string>(record, "Created") || record.createdTime,
          source: "discovery",
        });
      }
    }
  }

  // Sort by date entered (newest first)
  students.sort(
    (a, b) => new Date(b.dateEntered).getTime() - new Date(a.dateEntered).getTime()
  );

  return students;
}

export function computeFunnelCounts(students: Student[]): Record<FunnelStage, number> {
  const counts: Record<FunnelStage, number> = {
    Lead: 0,
    Application: 0,
    Interview: 0,
    Client: 0,
  };

  for (const student of students) {
    counts[student.stage]++;
  }

  return counts;
}
