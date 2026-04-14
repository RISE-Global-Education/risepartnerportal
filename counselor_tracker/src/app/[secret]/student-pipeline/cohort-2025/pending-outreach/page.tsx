import { fetchAllRecords, getField } from "@/lib/airtable";
import PendingOutreachClient from "./PendingOutreachClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";

export interface PendingOutreachApplicant {
  recordId: string;
  applicantId: string;
  name: string;
  studentEmail: string;
  phone: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  currentGrade: string;
  schoolCollege: string;
  city: string;
  country: string;
  cohort: string;
  fieldsOfInterest: string;
  motivation: string;
  priorExperience: string;
  academicScore: string;
  testScores: string;
  previouslyApplied: string;
  howHeard: string;
  howHeardDetail: string;
  researchPackage: string;
  followUpStatus: string;
  outreach2025: string;
  outreachNotes2025: string;
  lastCallDate: string;
  createdTime: string;
}

export default async function PendingOutreachPage() {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const cutoff = "2026-01-01T00:00:00.000Z";

  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
    filterByFormula: `AND(
      IS_BEFORE({Created Time}, "${cutoff}"),
      {Follow Up Status} != "Client",
      {2025 Outreach} = "Pending"
    )`,
    fields: [
      "Applicant ID",
      "Name",
      "Student Email ID",
      "Phone number",
      "Parent Name",
      "Parent Email ID",
      "Parent Phone Number",
      "Current Grade",
      "School/ College",
      "City of Residence",
      "Country of Residence",
      "Select the Cohort you want to enroll in",
      "Field(s) of interest for research",
      "What motivates your interest in this field of research? (300 words or less)  ",
      "Please outline any relevant coursework or prior experience in this area of study? (300 words or less)  ",
      "What is your most recent academic performance score (e.g., GPA, IB score, percentile, etc.)?  Please include the maximum possible value for reference (e.g., 3.4/4.0, 38/42, etc.).  ",
      "If completed, please report your standardized test scores (SAT/ACT)",
      "Have you previously applied to RISE?",
      "How did you hear about us?",
      "Can you say more about how you found out? (E.g., Who recommended RISE to you?)",
      "Research Package",
      "Follow Up Status",
      "2025 Outreach",
      "2025 Outreach Notes",
      "Last Call Date",
      "Created Time",
    ],
  });

  const applicants: PendingOutreachApplicant[] = records
    .map((r) => ({
      recordId: r.id,
      applicantId: getField<string>(r, "Applicant ID") ?? "—",
      name: getField<string>(r, "Name") ?? "Unknown",
      studentEmail: getField<string>(r, "Student Email ID") ?? "",
      phone: getField<string>(r, "Phone number") ?? "",
      parentName: getField<string>(r, "Parent Name") ?? "",
      parentEmail: getField<string>(r, "Parent Email ID") ?? "",
      parentPhone: getField<string>(r, "Parent Phone Number") ?? "",
      currentGrade: getField<string>(r, "Current Grade") ?? "",
      schoolCollege: getField<string>(r, "School/ College") ?? "",
      city: getField<string>(r, "City of Residence") ?? "",
      country: getField<string>(r, "Country of Residence") ?? "",
      cohort: getField<string>(r, "Select the Cohort you want to enroll in") ?? "",
      fieldsOfInterest: getField<string>(r, "Field(s) of interest for research") ?? "",
      motivation: getField<string>(r, "What motivates your interest in this field of research? (300 words or less)  ") ?? "",
      priorExperience: getField<string>(r, "Please outline any relevant coursework or prior experience in this area of study? (300 words or less)  ") ?? "",
      academicScore: getField<string>(r, "What is your most recent academic performance score (e.g., GPA, IB score, percentile, etc.)?  Please include the maximum possible value for reference (e.g., 3.4/4.0, 38/42, etc.).  ") ?? "",
      testScores: getField<string>(r, "If completed, please report your standardized test scores (SAT/ACT)") ?? "",
      previouslyApplied: getField<string>(r, "Have you previously applied to RISE?") ?? "",
      howHeard: getField<string>(r, "How did you hear about us?") ?? "",
      howHeardDetail: getField<string>(r, "Can you say more about how you found out? (E.g., Who recommended RISE to you?)") ?? "",
      researchPackage: getField<string>(r, "Research Package") ?? "",
      followUpStatus: getField<string>(r, "Follow Up Status") ?? "",
      outreach2025: getField<string>(r, "2025 Outreach") ?? "",
      outreachNotes2025: getField<string>(r, "2025 Outreach Notes") ?? "",
      lastCallDate: getField<string>(r, "Last Call Date") ?? "",
      createdTime: getField<string>(r, "Created Time") ?? r.createdTime,
    }))
    .filter((a) => {
      const lastCallDate = a.lastCallDate ? new Date(a.lastCallDate) : null;

      // DNP override: 2025 outreach notes contain "dnp" AND last call date > 24h ago
      const hasDnp = a.outreachNotes2025.toLowerCase().includes("dnp");
      if (hasDnp && lastCallDate && lastCallDate < oneDayAgo) return true;

      // Last Call Date blank OR > 3 days ago
      if (lastCallDate && !isNaN(lastCallDate.getTime()) && lastCallDate >= threeDaysAgo) return false;

      return true;
    });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {applicants.length} student{applicants.length !== 1 ? "s" : ""} — 2025 cohort pending outreach
      </p>
      <PendingOutreachClient applicants={applicants} />
    </div>
  );
}
