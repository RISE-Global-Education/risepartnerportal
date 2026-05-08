import { fetchAllRecords, getField } from "@/lib/airtable";
import MentorFinderClient from "./MentorFinderClient";

const MENTOR_PIPELINE_BASE = "appFavjto15k519od";
const MENTOR_INFO_TABLE = "tblt4vfMm1tiywIeQ";

export interface CompletedMentor {
  recordId: string;
  mentorId: string;
  name: string;
  email: string;
  phone: string | null;
  linkedin: string | null;
  university: string | null;
  rate: string | null;
  education: string | null;
  researchAreas: string | null;
  notes: string | null;
  interviewDate: string | null;
}

export default async function MentorFinderPage() {
  const records = await fetchAllRecords(MENTOR_PIPELINE_BASE, MENTOR_INFO_TABLE, {
    fields: [
      "Full Name",
      "Email ID",
      "Phone number with country code (active on WhatsApp) e.g. +44 1234567890",
      "LinkedIn URL (if any)",
      "Please select your university",
      "If \"Other\" University, please mention here",
      "Rate",
      "Describe your Education:",
      "Research areas/fields you would be interested to mentor students",
      "Contract Status",
      "Mentor ID",
      "Notes",
      "Interview Date",
    ],
    filterByFormula: `FIND("Completed", ARRAYJOIN({Contract Status}))`,
  });

  const mentors: CompletedMentor[] = records.map((r) => {
    const uniSelect = getField<string>(r, "Please select your university");
    const uniOther = getField<string>(r, `If "Other" University, please mention here`);
    const university = uniSelect === "Other" ? (uniOther ?? "Other") : (uniSelect ?? null);

    return {
      recordId: r.id,
      mentorId: getField<string>(r, "Mentor ID") ?? "—",
      name: getField<string>(r, "Full Name") ?? "—",
      email: getField<string>(r, "Email ID") ?? "—",
      phone: getField<string>(r, "Phone number with country code (active on WhatsApp) e.g. +44 1234567890") ?? null,
      linkedin: getField<string>(r, "LinkedIn URL (if any)") ?? null,
      university,
      rate: getField<string>(r, "Rate") ?? null,
      education: getField<string>(r, "Describe your Education:") ?? null,
      researchAreas: getField<string>(r, "Research areas/fields you would be interested to mentor students") ?? null,
      notes: getField<string>(r, "Notes") ?? null,
      interviewDate: getField<string>(r, "Interview Date") ?? null,
    };
  });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {mentors.length} completed mentor{mentors.length !== 1 ? "s" : ""}
      </p>
      <MentorFinderClient mentors={mentors} />
    </div>
  );
}
