import DuplicateLeadsClient from "./DuplicateLeadsClient";
import { fetchAllRecords, getField } from "@/lib/airtable";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

export interface DuplicateGroup {
  matchedOn: "student" | "parent" | "both";
  matchEmail: string;
  records: {
    applicantId: string;
    studentName: string;
    studentEmail: string;
    parentName: string;
    parentEmail: string;
  }[];
}

export default async function DuplicateLeadsPage() {
  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
    fields: ["Applicant ID", "Student Name", "Student Email ID", "Parent/Guardian Name", "Parent Email ID"],
  });

  const rows = records.map((r) => ({
    applicantId: getField<string>(r, "Applicant ID") ?? "—",
    studentName: getField<string>(r, "Student Name") ?? "—",
    studentEmail: (getField<string>(r, "Student Email ID") ?? "").toLowerCase().trim(),
    parentName: getField<string>(r, "Parent/Guardian Name") ?? "—",
    parentEmail: (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim(),
  }));

  // Group by student email
  const studentEmailMap = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.studentEmail) continue;
    if (!studentEmailMap.has(row.studentEmail)) studentEmailMap.set(row.studentEmail, []);
    studentEmailMap.get(row.studentEmail)!.push(row);
  }

  // Group by parent email
  const parentEmailMap = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.parentEmail) continue;
    if (!parentEmailMap.has(row.parentEmail)) parentEmailMap.set(row.parentEmail, []);
    parentEmailMap.get(row.parentEmail)!.push(row);
  }

  // Build duplicate groups — track which applicant IDs are already in a group
  const seen = new Set<string>();
  const groups: DuplicateGroup[] = [];

  for (const [email, recs] of studentEmailMap) {
    if (recs.length < 2) continue;
    const key = recs.map((r) => r.applicantId).sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    // Check if parent email also matches
    const parentMatch = recs.every((r) => r.parentEmail && r.parentEmail === recs[0].parentEmail);
    groups.push({
      matchedOn: parentMatch ? "both" : "student",
      matchEmail: email,
      records: recs,
    });
  }

  for (const [email, recs] of parentEmailMap) {
    if (recs.length < 2) continue;
    const key = recs.map((r) => r.applicantId).sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push({
      matchedOn: "parent",
      matchEmail: email,
      records: recs,
    });
  }

  // Sort records within each group by applicant ID ascending
  for (const g of groups) {
    g.records.sort((a, b) => a.applicantId.localeCompare(b.applicantId));
  }

  // Sort groups by primary (lowest) applicant ID ascending
  groups.sort((a, b) => a.records[0].applicantId.localeCompare(b.records[0].applicantId));

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        <span className="text-rise-black font-medium">{groups.length}</span> duplicate group{groups.length !== 1 ? "s" : ""} found
      </p>
      <DuplicateLeadsClient groups={groups} />
    </div>
  );
}
