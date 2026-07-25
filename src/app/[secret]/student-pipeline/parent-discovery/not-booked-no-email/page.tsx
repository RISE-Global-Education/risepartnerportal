import { fetchAllRecords, getField } from "@/lib/airtable";
import { getMixmaxData } from "@/lib/mixmax";
import { cookies } from "next/headers";
import NotBookedNoEmailClient from "./NotBookedNoEmailClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

const BOOKING_SEQUENCES = [
  "Parents  Discovery - Booking Link",
  "Parents Discovery - Booking Link (Updated)",
  "Parents Discovery - Booking Link Pakistan",
];

export interface NotBookedNoEmailLead {
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

export default async function NotBookedNoEmailPage() {
  const cookieStore = await cookies();
  const userName = cookieStore.get("team_auth")?.value ?? "";
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 21 * 60 * 60 * 1000);
  const lastCallCutoff = new Date(now.getTime() - 69 * 60 * 60 * 1000);
  const cutoff = oneDayAgo.toISOString();

  const [records, { recipients: allRecipients, cachedAt: mixmaxCachedAt }] = await Promise.all([
    fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
      filterByFormula: `AND(
        IS_BEFORE({Created}, "${cutoff}"),
        {Qualified} != "No",
        {Student Application Form} != "Drop",
        OR({DNP Counter} = BLANK(), {DNP Counter} < 4)
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
    }),
    getMixmaxData(),
  ]);

  // Build set of parent emails that appear in the booking sequences
  const emailsInMixmax = new Set<string>();
  for (const r of allRecipients) {
    if (!BOOKING_SEQUENCES.includes(r.sequenceName ?? "")) continue;
    emailsInMixmax.add(r.email.toLowerCase().trim());
  }

  const leads: NotBookedNoEmailLead[] = records
    .map((r) => {
      const counselorArr = getField<string[]>(r, "Company Name (from Counselor Source)") ?? [];
      const parentEmail = (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim();
      return {
        recordId: r.id,
        applicantId: getField<string>(r, "Applicant ID") ?? "—",
        studentName: getField<string>(r, "Student Name") ?? "Unknown",
        studentEmail: getField<string>(r, "Student Email ID") ?? "",
        parentName: getField<string>(r, "Parent/Guardian Name") ?? "",
        parentEmail,
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
      // Only leads not in any booking sequence
      if (emailsInMixmax.has(lead.parentEmail)) return false;
      if (["Call Booked", "Call Complete", "Call Completed"].includes(lead.callStatus)) return false;

      const lastContactedDate = lead.lastContacted ? new Date(lead.lastContacted) : null;

      // DNP override: call notes contain "dnp" AND last call date > 21h ago
      const hasDnp = lead.callNotes.toLowerCase().includes("dnp");
      if (hasDnp && lastContactedDate && lastContactedDate < oneDayAgo) return true;

      // Exclude if last contacted within the past ~3 days
      if (lastContactedDate && lastContactedDate.getTime() >= lastCallCutoff.getTime()) return false;

      const noConsultation = !lead.consultationDate;
      const noNotes = !lead.notes.trim();
      return noConsultation && noNotes;
    });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-1">
        {leads.length} lead{leads.length !== 1 ? "s" : ""} — no booking email sent
      </p>
      <p className="text-xs text-rise-brown/70 mb-4">
        Leads in the pipeline whose parent email has not been added to any Mixmax booking sequence. Add them to the sequence to begin outreach.
      </p>
      <NotBookedNoEmailClient leads={leads} mixmaxCachedAt={mixmaxCachedAt} userName={userName} />
    </div>
  );
}
