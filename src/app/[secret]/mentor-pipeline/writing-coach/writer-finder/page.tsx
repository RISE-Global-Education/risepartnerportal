import { fetchAllRecords, getField } from "@/lib/airtable";
import WriterFinderClient from "./WriterFinderClient";

const WC_PIPELINE_BASE = "appFavjto15k519od";
const WC_INFO_TABLE = "tblnb27SRJjEjgKcO";

export interface ActiveWriter {
  recordId: string;
  coachId: string;
  name: string;
  email: string;
  phone: string | null;
  backupContact: string | null;
  rate: string | null;
  interviewDate: string | null;
  fieldsOfInterest: string | null;
  notes: string | null;
  resumeUrl: string | null;
  resumeFilename: string | null;
}

export default async function WriterFinderPage() {
  const records = await fetchAllRecords(WC_PIPELINE_BASE, WC_INFO_TABLE, {
    fields: [
      "Coach ID",
      "Full Name",
      "Email ID",
      "Phone number with country code (active on WhatsApp) e.g. +44 1234567890",
      "Backup Contact",
      "Rate",
      "Interview Date",
      "Fields of Interest",
      "Notes",
      "Active Status",
      "Training Status",
      "Resume",
    ],
    filterByFormula: `AND({Active Status}="Yes",{Training Status}="Complete")`,
  });

  const writers: ActiveWriter[] = records.map((r) => {
    const resumeAttachments = getField<{ url: string; filename: string }[]>(r, "Resume");
    const resume = resumeAttachments && resumeAttachments.length > 0 ? resumeAttachments[0] : null;

    return {
      recordId: r.id,
      coachId: getField<string>(r, "Coach ID") ?? "—",
      name: getField<string>(r, "Full Name") ?? "—",
      email: getField<string>(r, "Email ID") ?? "—",
      phone: getField<string>(r, "Phone number with country code (active on WhatsApp) e.g. +44 1234567890") ?? null,
      backupContact: getField<string>(r, "Backup Contact") ?? null,
      rate: getField<string>(r, "Rate") ?? null,
      interviewDate: getField<string>(r, "Interview Date") ?? null,
      fieldsOfInterest: getField<string>(r, "Fields of Interest") ?? null,
      notes: getField<string>(r, "Notes") ?? null,
      resumeUrl: resume?.url ?? null,
      resumeFilename: resume?.filename ?? null,
    };
  });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {writers.length} active writer{writers.length !== 1 ? "s" : ""}
      </p>
      <WriterFinderClient writers={writers} />
    </div>
  );
}
