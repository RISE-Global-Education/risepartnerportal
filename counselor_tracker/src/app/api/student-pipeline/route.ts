import { NextResponse } from "next/server";
import { fetchAllRecords, getField } from "@/lib/airtable";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll"; // Research Scholar Application

export async function GET() {
  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
    filterByFormula: `{Acceptance Status} = ""`,
    fields: [
      "Applicant ID",
      "Name",
      "Phone number",
      "Current Grade",
      "School/ College",
      "Select the Cohort you want to enroll in",
      "Field(s) of interest for research",
      "What motivates your interest in this field of research? (300 words or less)",
      "Please outline any relevant coursework or prior experience in this area of study? (300 words or less)",
      "Have you previously applied to RISE?",
      "Research Package",
      "Counselor Source",
      "Notes",
      "Date",
      "Acceptance Status",
    ],
  });

  const students = records.map((r) => ({
    recordId: r.id,
    applicantId: getField<string>(r, "Applicant ID") ?? "—",
    name: getField<string>(r, "Name") ?? "Unknown",
    phone: getField<string>(r, "Phone number") ?? "",
    currentGrade: getField<string>(r, "Current Grade") ?? "",
    schoolCollege: getField<string>(r, "School/ College") ?? "",
    cohort: getField<string>(r, "Select the Cohort you want to enroll in") ?? "",
    fieldsOfInterest: getField<string>(r, "Field(s) of interest for research") ?? "",
    motivation:
      getField<string>(
        r,
        "What motivates your interest in this field of research? (300 words or less)"
      ) ?? "",
    priorExperience:
      getField<string>(
        r,
        "Please outline any relevant coursework or prior experience in this area of study? (300 words or less)"
      ) ?? "",
    previouslyApplied: getField<string>(r, "Have you previously applied to RISE?") ?? "",
    researchPackage: getField<string>(r, "Research Package") ?? "",
    counselorSource: getField<string>(r, "Counselor Source") ?? "",
    notes: getField<string>(r, "Notes") ?? "",
    date: getField<string>(r, "Date") ?? "",
  }));

  return NextResponse.json({ students });
}
