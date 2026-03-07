import { fetchAllRecords, getField } from "@/lib/airtable";
import ShortlistingClient from "../shortlisting/ShortlistingClient";
import type { ShortlistApplicant } from "../shortlisting/page";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";

const ACCEPTANCE_STATUS_FILTERS = ["AWA1", "AWA2", "AWA3", "Call Payment"];

export default async function AcceptancePage() {
  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
    filterByFormula: `OR({Follow Up Status}="AWA1",{Follow Up Status}="AWA2",{Follow Up Status}="AWA3",{Follow Up Status}="Call Payment")`,
    fields: [
      "Applicant ID",
      "Name",
      "Phone number",
      "Parent Name",
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
      "Call Status",
      "Call Notes",
    ],
  });

  const applicants: ShortlistApplicant[] = records.map((r) => ({
    recordId: r.id,
    applicantId: getField<string>(r, "Applicant ID") ?? "—",
    name: getField<string>(r, "Name") ?? "Unknown",
    phone: getField<string>(r, "Phone number") ?? "",
    parentName: getField<string>(r, "Parent Name") ?? "",
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
    callStatus: getField<string>(r, "Call Status") ?? "",
    callNotes: getField<string>(r, "Call Notes") ?? "",
  }));

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        Applicants in acceptance stage — {applicants.length} student
        {applicants.length !== 1 ? "s" : ""}
      </p>
      <ShortlistingClient
        applicants={applicants}
        statusFilters={ACCEPTANCE_STATUS_FILTERS}
        emptyMessage="No applicants in acceptance stage."
      />
    </div>
  );
}
