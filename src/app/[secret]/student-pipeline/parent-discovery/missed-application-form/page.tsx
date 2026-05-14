import { fetchAllRecords, getField } from "@/lib/airtable";
import { cookies } from "next/headers";
import MissedApplicationFormClient from "./MissedApplicationFormClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";
const APPLICATION_TABLE = "tblpsa6QdGW9qmyll";

export interface MissedAppFormLead {
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
  callStatus: string;
  lastContacted: string;
  createdTime: string;
  poc: string;
  dnpCounter: number;
  appFormCallNotes: string;
  appFormCallDate: string;
}

export default async function MissedApplicationFormPage() {
  const cookieStore = await cookies();
  const userName = cookieStore.get("team_auth")?.value ?? "";

  // Fetch discovery leads where form was sent
  const [discoveryRecords, applicationRecords] = await Promise.all([
    fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
      filterByFormula: `{Student Application Form} = "Form Sent"`,
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
        "Call Status",
        "Last Call Date",
        "POC",
        "DNP Counter",
        "Application Form Call Notes",
        "Application Form Call Date",
      ],
    }),
    fetchAllRecords(STUDENT_PIPELINE_BASE, APPLICATION_TABLE, {
      fields: ["Student Email ID", "Parent Email ID"],
    }),
  ]);

  // Build a set of all emails present in the application table
  const appliedEmails = new Set<string>();
  for (const r of applicationRecords) {
    const se = (getField<string>(r, "Student Email ID") ?? "").toLowerCase().trim();
    const pe = (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim();
    if (se) appliedEmails.add(se);
    if (pe) appliedEmails.add(pe);
  }

  const oneDayAgo = new Date(Date.now() - 21 * 60 * 60 * 1000);

  const leads: MissedAppFormLead[] = discoveryRecords
    .map((r) => {
      const counselorArr = getField<string[]>(r, "Company Name (from Counselor Source)") ?? [];
      return {
        recordId: r.id,
        applicantId: getField<string>(r, "Applicant ID") ?? "—",
        studentName: getField<string>(r, "Student Name") ?? "Unknown",
        studentEmail: (getField<string>(r, "Student Email ID") ?? "").toLowerCase().trim(),
        parentName: getField<string>(r, "Parent/Guardian Name") ?? "",
        parentEmail: (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim(),
        parentPhone: getField<string>(r, "Parent Phone number") ?? "",
        currentGrade: getField<string>(r, "Current Grade") ?? "",
        country: getField<string>(r, "Country of Residence") ?? "",
        schoolCollege: getField<string>(r, "School/ College Name") ?? "",
        additionalInfo:
          getField<string>(
            r,
            "Is there anything else you would like us to know about the student?"
          ) ?? "",
        qualified: getField<string>(r, "Qualified") ?? "",
        studentApplicationForm: getField<string>(r, "Student Application Form") ?? "",
        consultationDate: getField<string>(r, "Consultation Date") ?? "",
        counselorSource: counselorArr.join(", "),
        notes: getField<string>(r, "Notes") ?? "",
        callNotes: getField<string>(r, "Call Notes") ?? "",
        callStatus: getField<string>(r, "Call Status") ?? "",
        lastContacted: getField<string>(r, "Last Call Date") ?? "",
        createdTime: r.createdTime,
        poc: getField<string>(r, "POC") ?? "",
        dnpCounter: getField<number>(r, "DNP Counter") ?? 0,
        appFormCallNotes: getField<string>(r, "Application Form Call Notes") ?? "",
        appFormCallDate: getField<string>(r, "Application Form Call Date") ?? "",
      };
    })
    .filter((lead) => {
      if (lead.dnpCounter >= 4) return false;

      // Keep only those who haven't submitted the application form
      const studentMatched = lead.studentEmail && appliedEmails.has(lead.studentEmail);
      const parentMatched = lead.parentEmail && appliedEmails.has(lead.parentEmail);
      if (studentMatched || parentMatched) return false;

      // Hide if app form call was made less than 21 hours ago
      if (lead.appFormCallDate) {
        const callDate = new Date(lead.appFormCallDate);
        if (callDate > oneDayAgo) return false;
      }

      return true;
    });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-1">
        {leads.length} lead{leads.length !== 1 ? "s" : ""}
      </p>
      <p className="text-xs text-rise-brown/70 mb-4">
        Leads where the application form was sent but neither the student nor parent email appears in the Research Scholar Application table, and have a DNP counter below 4.
      </p>
      <MissedApplicationFormClient leads={leads} userName={userName} />
    </div>
  );
}
