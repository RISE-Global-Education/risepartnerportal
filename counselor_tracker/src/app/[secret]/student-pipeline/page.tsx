import { fetchAllRecords, getField } from "@/lib/airtable";
import StudentPipelineClient from "./StudentPipelineClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll"; // Research Scholar Application

export interface ScholarApplicant {
  recordId: string;
  applicantId: string;
  name: string;
  phone: string;
  parentName: string;
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
  interviewDate: string;
  notes: string;
}

export default async function StudentPipelinePage() {
  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
    filterByFormula: `{Acceptance Status} = ""`,
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
      "Interview Date",
      "Notes",
    ],
  });

  const students: ScholarApplicant[] = records.map((r) => ({
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
    interviewDate: getField<string>(r, "Interview Date") ?? "",
    notes: getField<string>(r, "Notes") ?? "",
  }));

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        Research Scholar applicants pending acceptance — {students.length} student
        {students.length !== 1 ? "s" : ""}
      </p>
      <StudentPipelineClient students={students} />
    </div>
  );
}
