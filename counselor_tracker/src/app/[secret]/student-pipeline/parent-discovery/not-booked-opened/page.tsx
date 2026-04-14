import { fetchAllRecords, getField } from "@/lib/airtable";
import { getMixmaxData } from "@/lib/mixmax";
import NotBookedOpenedClient from "./NotBookedOpenedClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const DISCOVERY_CALL_TABLE = "tblCQAqQEbO1cHavW";

const BOOKING_SEQUENCES = [
  "Parents Discovery - Booking Link",
  "Parents Discovery - Booking Link (Updated)",
];

export interface NotBookedOpenedLead {
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
  // Mixmax
  sequenceName: string;
  openCount: number;
}

export default async function NotBookedOpenedPage() {
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
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
        "Call Status",
        "Last Call Date",
        "POC",
      ],
    }),
    getMixmaxData(),
  ]);

  // Build email → best mixmax row map (highest open count wins) for booking sequences only
  const mixmaxByEmail = new Map<string, { sequenceName: string; openCount: number }>();
  for (const r of allRecipients) {
    if (!BOOKING_SEQUENCES.includes(r.sequenceName ?? "")) continue;
    const email = r.email.toLowerCase().trim();
    const existing = mixmaxByEmail.get(email);
    if (!existing || r.opened > existing.openCount) {
      mixmaxByEmail.set(email, {
        sequenceName: r.sequenceName ?? "",
        openCount: r.opened,
      });
    }
  }

  const leads: NotBookedOpenedLead[] = records
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
        sequenceName: mixmax?.sequenceName ?? "",
        openCount: mixmax?.openCount ?? 0,
      };
    })
    .filter((lead) => {
      // Hard gates — must always pass
      if (lead.openCount === 0) return false;
      if (["Call Booked", "Call Completed"].includes(lead.callStatus)) return false;

      const lastContactedDate = lead.lastContacted ? new Date(lead.lastContacted) : null;

      // DNP override: call notes contain "dnp" AND last call date > 24h ago
      const hasDnp = lead.callNotes.toLowerCase().includes("dnp");
      if (hasDnp && lastContactedDate && lastContactedDate < oneDayAgo) return true;

      // Exclude if last contacted within the past 7 days
      if (lastContactedDate && lastContactedDate.getTime() >= sevenDaysAgo.getTime()) return false;

      // Not booked conditions: pending consultation and no notes
      const noConsultation = !lead.consultationDate;
      const noNotes = !lead.notes.trim();
      return noConsultation && noNotes;
    });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-1">
        {leads.length} lead{leads.length !== 1 ? "s" : ""} — opened booking email, not yet booked
      </p>
      <p className="text-xs text-rise-brown/70 mb-4">
        Leads who opened the booking email but haven&apos;t booked a call, haven&apos;t been followed up in 7+ days (or were marked Did Not Pick Up 24+ hours ago), and haven&apos;t booked or completed a call.
      </p>
      <NotBookedOpenedClient leads={leads} mixmaxCachedAt={mixmaxCachedAt} />
    </div>
  );
}
