import { cookies } from "next/headers";
import { fetchAllRecords, getField } from "@/lib/airtable";
import StudentPipelineClient from "./StudentPipelineClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll"; // Research Scholar Application

export interface ScholarApplicant {
  recordId: string;
  applicantId: string;
  name: string;
  email: string;
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
  interviewDate: string;
  notes: string;
  mentorField: string;
  scholarshipPercent: string;
}

export default async function StudentPipelinePage() {
  const cookieStore = await cookies();
  const userName = cookieStore.get("team_auth")?.value ?? "";

  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
    filterByFormula: `{Acceptance Status} = ""`,
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
      "Interview Date",
      "Notes",
      "Mentor Field",
      "Scholarship %",
    ],
  });

  const students: ScholarApplicant[] = records.map((r) => ({
    recordId: r.id,
    applicantId: getField<string>(r, "Applicant ID") ?? "—",
    name: getField<string>(r, "Name") ?? "Unknown",
    email: getField<string>(r, "Student Email ID") ?? "",
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
    interviewDate: getField<string>(r, "Interview Date") ?? "",
    notes: getField<string>(r, "Notes") ?? "",
    mentorField: getField<string>(r, "Mentor Field") ?? "",
    scholarshipPercent: getField<number>(r, "Scholarship %")?.toString() ?? "",
  }));

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        Research Scholar applicants pending acceptance — {students.length} student
        {students.length !== 1 ? "s" : ""}
      </p>
      <StudentPipelineClient students={students} userName={userName} />
    </div>
  );
}
