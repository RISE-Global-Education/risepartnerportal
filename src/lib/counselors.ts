import { fetchAllRecords, getField } from "./airtable";
import { query, toStr } from "./lms-db";
import { COUNSELOR_CONTACTS as CT } from "./supabase-schema";
import type { Counselor, Contact } from "./types";

// Partners in these Follow Up statuses are dead leads — every "who hasn't
// been contacted" or "who needs a call" view should exclude them rather
// than nagging the team about accounts nobody is chasing anymore.
export const HIDDEN_FOLLOWUP_STATUSES: readonly string[] = ["Rejected", "Unqualified"];

// Base IDs
const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";

// Table IDs
const COUNSELOR_DB_TABLE = "tblxCiUOdN435Zfju"; // Counselor Database (Base 2)
const COUNSELOR_RECORDS_TABLE = "tblzcy02PoVxhAXId"; // Counselor Records (Base 1)

export function generateSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function getAllCounselors(): Promise<Counselor[]> {
  const records = await fetchAllRecords(COUNSELOR_DB_BASE, COUNSELOR_DB_TABLE, {
    fields: [
      "Partner Name",
      "Counselor ID",
      "First Name",
      "Email ID (s)",
      "Scholarship Amount",
      "Referral Amount",
      "Full Names (Contact DB)",
      "Email (Contact DB)",
      "POC",
      "POC (RISE)",
      "Country",
      "Expected Number",
      "Follow Up Status",
      "Student Interview",
      "Share Brochure",
      "Share Payment",
      "Student MixMax Addin",
      "MOU",
      "Partner Type",
      "Workshop Type",
      "Last Conversation Date",
      "Partner Password",
    ],
  });

  return records
    .map((record) => {
      const companyName = getField<string>(record, "Partner Name") || "";
      return {
        id: record.id,
        counselorId: getField<string>(record, "Counselor ID") || "",
        companyName,
        firstName: getField<string>(record, "First Name") || "",
        email: getField<string>(record, "Email ID (s)") || "",
        scholarshipAmount: getField<number>(record, "Scholarship Amount"),
        referralAmount: getField<number>(record, "Referral Amount"),
        pocNames: getField<string[]>(record, "Full Names (Contact DB)") || [],
        pocEmails: getField<string[]>(record, "Email (Contact DB)") || [],
        pocRecordIds: getField<string[]>(record, "POC") || [],
        risePoc: getField<string[]>(record, "POC (RISE)") || [],
        country: getField<string>(record, "Country") || "",
        capacity: getField<string>(record, "Expected Number") || "",
        followUpStatus: getField<string>(record, "Follow Up Status") || "",
        studentInterview: getField<string>(record, "Student Interview") || "",
        shareBrochure: getField<string>(record, "Share Brochure") || "",
        sharePayment: getField<string>(record, "Share Payment") || "",
        studentMixMaxAddin: getField<string>(record, "Student MixMax Addin") || "",
        mouUrl: (() => {
          const attachments = getField<{ url: string }[]>(record, "MOU");
          return attachments && attachments.length > 0 ? attachments[0].url : null;
        })(),
        partnerType: getField<string>(record, "Partner Type") || "",
        workshopType: getField<string>(record, "Workshop Type") || "",
        lastConversationDate: getField<string>(record, "Last Conversation Date") || null,
        slug: generateSlug(companyName),
        partnerPassword: getField<string>(record, "Partner Password") || "",
      };
    })
    .filter((c) => c.companyName && c.counselorId);
}

export async function getCounselorBySlug(
  slug: string
): Promise<{ counselor: Counselor; isCeoView: boolean } | null> {
  const counselors = await getAllCounselors();

  const exactMatch = counselors.find((c) => c.slug === slug);
  if (exactMatch) {
    return { counselor: exactMatch, isCeoView: false };
  }

  for (const counselor of counselors) {
    const ceoSlug = `${counselor.slug}-${counselor.counselorId.toLowerCase()}`;
    if (slug.toLowerCase() === ceoSlug) {
      return { counselor, isCeoView: true };
    }
  }

  return null;
}

// Reads counselor_contacts in Supabase — Contacts are created in Supabase
// only now (see supabase-schema.ts), so this is the sole source of contact
// phone numbers going forward, not just the legacy-Airtable ones.
export async function getAllContactPhones(): Promise<Map<string, string[]>> {
  const rows = await query<{ counselor_id: string | null; phone_number: string | null }>(
    "counselor-contacts",
    `SELECT ${CT.counselorId} AS counselor_id, ${CT.phoneNumber} AS phone_number FROM ${CT.table}`
  );
  const phonesByCounselor = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.counselor_id || !row.phone_number) continue;
    const existing = phonesByCounselor.get(row.counselor_id) || [];
    existing.push(row.phone_number);
    phonesByCounselor.set(row.counselor_id, existing);
  }
  return phonesByCounselor;
}

export async function getContactsForCounselor(counselorId: string): Promise<Contact[]> {
  if (!counselorId) return [];

  const rows = await query<{
    id: string;
    name: string | null;
    email: string | null;
    phone_number: string | null;
    position: string | null;
    first_name: string | null;
    email_opt_in: boolean | null;
    lead_id: string | null;
  }>(
    "counselor-contacts",
    `SELECT ${CT.id}::text AS id, ${CT.name} AS name, ${CT.email} AS email,
            ${CT.phoneNumber} AS phone_number, ${CT.position} AS position,
            ${CT.firstName} AS first_name, ${CT.emailOptIn} AS email_opt_in, ${CT.leadId} AS lead_id
       FROM ${CT.table}
      WHERE ${CT.counselorId} = $1`,
    [counselorId]
  );

  return rows.map((row) => ({
    id: row.id,
    name: toStr(row.name) || "",
    email: toStr(row.email) || "",
    phone: toStr(row.phone_number) || "",
    position: toStr(row.position) || "",
    eFname: toStr(row.first_name) || "",
    outreachOptIn: row.email_opt_in !== false,
    leadId: toStr(row.lead_id) || "",
  }));
}


export async function getCounselorStudentLinks(counselorId: string): Promise<{
  discoveryCallIds: string[];
  applicationIds: string[];
}> {
  const records = await fetchAllRecords(
    STUDENT_PIPELINE_BASE,
    COUNSELOR_RECORDS_TABLE,
    {
      fields: [
        "Counselor ID",
        "Research Scholar Application",
        "Parent Discovery Call",
      ],
      filterByFormula: `{Counselor ID} = "${counselorId}"`,
    }
  );

  const discoveryCallIds: string[] = [];
  const applicationIds: string[] = [];

  for (const record of records) {
    const discoveryCalls = getField<string[]>(record, "Parent Discovery Call") || [];
    const applications = getField<string[]>(record, "Research Scholar Application") || [];
    discoveryCallIds.push(...discoveryCalls);
    applicationIds.push(...applications);
  }

  return { discoveryCallIds, applicationIds };
}
