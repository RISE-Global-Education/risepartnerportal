import { fetchAllRecords, getField } from "@/lib/airtable";
import { cookies } from "next/headers";
import MissedCallsClient from "./MissedCallsClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

const EXCLUDED_CALL_STATUSES = new Set(["Call Complete", "Call Completed"]);

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
  callStatus: string;
  lastContacted: string;
  createdTime: string;
  poc: string;
  dnpCounter: number;
}

export default async function MissedCallsPage() {
  const cookieStore = await cookies();
  const userName = cookieStore.get("team_auth")?.value ?? "";
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const records = await fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
    filterByFormula: `AND(
      IS_BEFORE({Created}, "${cutoff}"),
      {Qualified} != "No",
      {Student Application Form} != "Drop",
      OR({DNP Counter} = BLANK(), {DNP Counter} < 4),
      SEARCH("missed", LOWER(IF({Notes}, {Notes}, "")))
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
      "Call Status",
      "Last Call Date",
      "POC",
      "DNP Counter",
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
        callStatus: getField<string>(r, "Call Status") ?? "",
        lastContacted: getField<string>(r, "Last Call Date") ?? "",
        createdTime: r.createdTime,
        poc: getField<string>(r, "POC") ?? "",
        dnpCounter: getField<number>(r, "DNP Counter") ?? 0,
      };
    })
    .filter((lead) => {
      if (EXCLUDED_CALL_STATUSES.has(lead.callStatus)) return false;
      if (lead.callNotes.toLowerCase().includes("call done")) return false;

      const lastContactedDate = lead.lastContacted ? new Date(lead.lastContacted) : null;
      if (lastContactedDate && lastContactedDate >= oneDayAgo) return false;
      return true;
    });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-1">
        {leads.length} missed lead{leads.length !== 1 ? "s" : ""}
      </p>
      <p className="text-xs text-rise-brown/70 mb-4">
        Leads where the notes mention a missed call, haven&apos;t been called back in 24+ hours, have a DNP counter below 4, haven&apos;t booked or completed a call, and whose call notes don&apos;t contain &quot;Call Done&quot;.
      </p>
      <MissedCallsClient leads={leads} userName={userName} />
    </div>
  );
}
