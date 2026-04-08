import { fetchAllRecords, getField } from "@/lib/airtable";
import MissedCallsClient from "./MissedCallsClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

export interface DiscoveryLead {
  recordId: string;
  applicantId: string;
  studentName: string;
  studentEmail: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  currentGrade: string;
  country: string;
  schoolCollege: string;
  additionalInfo: string;
  qualified: string;
  studentApplicationForm: string;
  consultationDate: string;
  counselorSource: string;
  notes: string;
  callNotes: string;
  lastContacted: string;
  createdTime: string;
  poc: string;
}

export default async function MissedCallsPage() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
    filterByFormula: `AND(
      IS_BEFORE({Created}, "${cutoff}"),
      {Qualified} != "No",
      {Student Application Form} != "Drop"
    )`,
    fields: [
      "Applicant ID",
      "Student Name",
      "Student Email ID",
      "Parent/Guardian Name",
      "Parent Email ID",
      "Parent Phone number",
      "Current Grade",
      "Country of Residence",
      "School/ College Name",
      "Is there anything else you would like us to know about the student?",
      "Qualified",
      "Student Application Form",
      "Consultation Date",
      "Company Name (from Counselor Source)",
      "Notes",
      "Call Notes",
      "Last Contacted",
      "POC",
    ],
  });

  const leads: DiscoveryLead[] = records
    .map((r) => {
      const counselorArr = getField<string[]>(r, "Company Name (from Counselor Source)") ?? [];
      return {
        recordId: r.id,
        applicantId: getField<string>(r, "Applicant ID") ?? "—",
        studentName: getField<string>(r, "Student Name") ?? "Unknown",
        studentEmail: getField<string>(r, "Student Email ID") ?? "",
        parentName: getField<string>(r, "Parent/Guardian Name") ?? "",
        parentEmail: getField<string>(r, "Parent Email ID") ?? "",
        parentPhone: getField<string>(r, "Parent Phone number") ?? "",
        currentGrade: getField<string>(r, "Current Grade") ?? "",
        country: getField<string>(r, "Country of Residence") ?? "",
        schoolCollege: getField<string>(r, "School/ College Name") ?? "",
        additionalInfo: getField<string>(r, "Is there anything else you would like us to know about the student?") ?? "",
        qualified: getField<string>(r, "Qualified") ?? "",
        studentApplicationForm: getField<string>(r, "Student Application Form") ?? "",
        consultationDate: getField<string>(r, "Consultation Date") ?? "",
        counselorSource: counselorArr.join(", "),
        notes: getField<string>(r, "Notes") ?? "",
        callNotes: getField<string>(r, "Call Notes") ?? "",
        lastContacted: getField<string>(r, "Last Contacted") ?? "",
        createdTime: r.createdTime,
        poc: getField<string>(r, "POC") ?? "",
      };
    })
    .filter((lead) => {
      const noConsultation = !lead.consultationDate;
      const noNotes = !lead.notes.trim();
      const notesMissed = lead.notes.toLowerCase().includes("missed");
      return noConsultation || noNotes || notesMissed;
    });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {leads.length} missed lead{leads.length !== 1 ? "s" : ""}
      </p>
      <MissedCallsClient leads={leads} />
    </div>
  );
}
