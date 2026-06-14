import { fetchAllRecords, getField } from "@/lib/airtable";
import { getMixmaxData } from "@/lib/mixmax";
import { cookies } from "next/headers";
import NotBookedNotOpenedClient from "./NotBookedNotOpenedClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

const BOOKING_SEQUENCES = [
  "Parents  Discovery - Booking Link",
  "Parents Discovery - Booking Link (Updated)",
];

export interface NotBookedNotOpenedLead {
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
  // Mixmax
  sequenceName: string;
  sentCount: number;
}

export default async function NotBookedNotOpenedPage() {
  const cookieStore = await cookies();
  const userName = cookieStore.get("team_auth")?.value ?? "";
  const cutoff = new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString();

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

  // Build email → mixmax row map for booking sequences only
  // Keep the row with the highest sent count per email
  const mixmaxByEmail = new Map<string, { sequenceName: string; sentCount: number; openCount: number }>();
  for (const r of allRecipients) {
    if (!BOOKING_SEQUENCES.includes(r.sequenceName ?? "")) continue;
    const email = r.email.toLowerCase().trim();
    const existing = mixmaxByEmail.get(email);
    if (!existing || r.sent > existing.sentCount) {
      mixmaxByEmail.set(email, {
        sequenceName: r.sequenceName ?? "",
        sentCount: r.sent,
        openCount: r.opened,
      });
    }
  }

  const leads: NotBookedNotOpenedLead[] = records
    .map((r) => {
      const counselorArr = getField<string[]>(r, "Company Name (from Counselor Source)") ?? [];
      const parentEmail = (getField<string>(r, "Parent Email ID") ?? "").toLowerCase().trim();
      const mixmax = mixmaxByEmail.get(parentEmail);
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
        sequenceName: mixmax?.sequenceName ?? "",
        sentCount: mixmax?.sentCount ?? 0,
        // openCount stored temporarily for filtering
        _openCount: mixmax?.openCount ?? 0,
      } as NotBookedNotOpenedLead & { _openCount: number };
    })
    .filter((lead) => {
      const l = lead as NotBookedNotOpenedLead & { _openCount: number };

      if (l.sentCount === 0) return false;
      if (l._openCount > 0) return false;
      if (["Call Booked", "Call Complete", "Call Completed"].includes(l.callStatus)) return false;
      if (l.callNotes.toLowerCase().includes("call done")) return false;
      return !l.consultationDate && !l.notes.trim();
    })
    .map((lead) => {
      // Strip the temporary _openCount field
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _openCount, ...rest } = lead as NotBookedNotOpenedLead & { _openCount: number };
      return rest;
    });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-1">
        {leads.length} lead{leads.length !== 1 ? "s" : ""} — booking email sent, not yet opened
      </p>
      <p className="text-xs text-rise-brown/70 mb-4">
        Leads who received a booking email but haven&apos;t opened it or booked a call. Excludes anyone marked as Call Done, Dropped, DNP counter 4+, or with a consultation date or notes set.
      </p>
      <NotBookedNotOpenedClient leads={leads} mixmaxCachedAt={mixmaxCachedAt} userName={userName} />
    </div>
  );
}
