import { fetchAllRecords, getField } from "@/lib/airtable";
import AcceptanceNotConvertedClient from "./AcceptanceNotConvertedClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";

export interface AcceptanceNotConvertedApplicant {
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
  shortlistSentTime: string;
  acceptanceSentTime: string;
  interviewDate: string;
  notes: string;
  paymentCallNotes: string;
  createdTime: string;
  lastCallDate: string;
}

export default async function AcceptanceNotConvertedPage() {
  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const jan2026 = new Date("2026-01-01T00:00:00.000Z");

  const EXCLUDED_STATUSES = new Set(["Drop", "Client"]);

  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
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
      "Shortlist Email Sent Time",
      "Acceptances Email Sent Time",
      "Interview Date",
      "Notes",
      "Payment Call Notes",
      "Created Time",
      "Last Call Date",
    ],
  });

  const applicants: AcceptanceNotConvertedApplicant[] = records
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
      shortlistSentTime: getField<string>(r, "Shortlist Email Sent Time") ?? "",
      acceptanceSentTime: getField<string>(r, "Acceptances Email Sent Time") ?? "",
      interviewDate: getField<string>(r, "Interview Date") ?? "",
      notes: getField<string>(r, "Notes") ?? "",
      paymentCallNotes: getField<string>(r, "Payment Call Notes") ?? "",
      createdTime: getField<string>(r, "Created Time") ?? r.createdTime,
      lastCallDate: getField<string>(r, "Last Call Date") ?? "",
    }))
    .filter((a) => {
      // Hard gates — always required
      if (new Date(a.createdTime) < jan2026) return false;
      if (!a.acceptanceSentTime) return false;
      const acceptanceSent = new Date(a.acceptanceSentTime);
      if (isNaN(acceptanceSent.getTime()) || acceptanceSent >= fiveDaysAgo) return false;
      if (EXCLUDED_STATUSES.has(a.followUpStatus)) return false;

      const lastCallDate = a.lastCallDate ? new Date(a.lastCallDate) : null;

      // DNP override: payment call notes contain "dnp" AND last call date > 24h ago
      const hasDnp = a.paymentCallNotes.toLowerCase().includes("dnp");
      if (hasDnp && lastCallDate && lastCallDate < oneDayAgo) return true;

      // Last Call Date is blank OR more than 3 days ago
      if (lastCallDate && !isNaN(lastCallDate.getTime()) && lastCallDate >= threeDaysAgo) return false;

      return true;
    });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {applicants.length} student{applicants.length !== 1 ? "s" : ""} — payment not yet made
      </p>
      <AcceptanceNotConvertedClient applicants={applicants} />
    </div>
  );
}
