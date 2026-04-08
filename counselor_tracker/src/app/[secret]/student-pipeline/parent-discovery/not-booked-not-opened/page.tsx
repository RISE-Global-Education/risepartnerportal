import { fetchAllRecords, getField } from "@/lib/airtable";
import { getMixmaxData } from "@/lib/mixmax";
import NotBookedNotOpenedClient from "./NotBookedNotOpenedClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

const BOOKING_SEQUENCES = [
  "Parents Discovery - Booking Link",
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
  lastContacted: string;
  createdTime: string;
  poc: string;
  // Mixmax
  sequenceName: string;
  sentCount: number;
}

export default async function NotBookedNotOpenedPage() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  const [records, { recipients: allRecipients, cachedAt: mixmaxCachedAt }] = await Promise.all([
    fetchAllRecords(STUDENT_PIPELINE_BASE, DISCOVERY_CALL_TABLE, {
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
        lastContacted: getField<string>(r, "Last Contacted") ?? "",
        createdTime: r.createdTime,
        poc: getField<string>(r, "POC") ?? "",
        sequenceName: mixmax?.sequenceName ?? "",
        sentCount: mixmax?.sentCount ?? 0,
        // openCount stored temporarily for filtering
        _openCount: mixmax?.openCount ?? 0,
      } as NotBookedNotOpenedLead & { _openCount: number };
    })
    .filter((lead) => {
      const l = lead as NotBookedNotOpenedLead & { _openCount: number };

      // Must have been sent to but NOT opened
      if (l.sentCount === 0) return false;
      if (l._openCount > 0) return false;

      // Exclude if last contacted within the past 7 days
      if (l.lastContacted) {
        const lastContactedMs = new Date(l.lastContacted).getTime();
        if (lastContactedMs >= sevenDaysAgo.getTime()) return false;
      }

      // Same missed conditions
      const noConsultation = !l.consultationDate;
      const noNotes = !l.notes.trim();
      const notesMissed = l.notes.toLowerCase().includes("missed");
      return noConsultation || noNotes || notesMissed;
    })
    .map((lead) => {
      // Strip the temporary _openCount field
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _openCount, ...rest } = lead as NotBookedNotOpenedLead & { _openCount: number };
      return rest;
    });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {leads.length} lead{leads.length !== 1 ? "s" : ""} — booking email sent, not yet opened
      </p>
      <NotBookedNotOpenedClient leads={leads} mixmaxCachedAt={mixmaxCachedAt} />
    </div>
  );
}
