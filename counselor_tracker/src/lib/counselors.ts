import { fetchAllRecords, getField } from "./airtable";
import type { Counselor, Contact } from "./types";

// Base IDs
const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";

// Table IDs
const COUNSELOR_DB_TABLE = "tblxCiUOdN435Zfju"; // Counselor Database (Base 2)
const COUNSELOR_RECORDS_TABLE = "tblzcy02PoVxhAXId"; // Counselor Records (Base 1)
const CONTACTS_TABLE = "tbl6kgEdDr0C3lib4";

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
      "Company Name",
      "Counselor ID",
      "First Name",
      "Email ID (s)",
      "Phone Number",
      "Scholarship Amount",
      "Referral Amount",
      "Full Names (Contact DB)",
      "Email (Contact DB)",
      "POC",
      "Country",
      "Expected Number",
      "Follow Up Status",
      "Student Interview",
      "Share Brochure",
      "Share Payment",
      "Student MixMax Addin",
      "MOU",
    ],
  });

  return records
    .map((record) => {
      const companyName = getField<string>(record, "Company Name") || "";
      return {
        id: record.id,
        counselorId: getField<string>(record, "Counselor ID") || "",
        companyName,
        firstName: getField<string>(record, "First Name") || "",
        email: getField<string>(record, "Email ID (s)") || "",
        phone: getField<string>(record, "Phone Number") || "",
        scholarshipAmount: getField<number>(record, "Scholarship Amount"),
        referralAmount: getField<number>(record, "Referral Amount"),
        pocNames: getField<string[]>(record, "Full Names (Contact DB)") || [],
        pocEmails: getField<string[]>(record, "Email (Contact DB)") || [],
        pocRecordIds: getField<string[]>(record, "POC") || [],
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
        slug: generateSlug(companyName),
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

export async function getContactsForCounselor(recordIds: string[]): Promise<Contact[]> {
  if (recordIds.length === 0) return [];

  const formula = `OR(${recordIds.map((id) => `RECORD_ID()="${id}"`).join(",")})`;
  const records = await fetchAllRecords(COUNSELOR_DB_BASE, CONTACTS_TABLE, {
    fields: ["Name", "Email (Contact DB)", "Position", "E_FNAME", "Email Opt-in", "Lead ID"],
    filterByFormula: formula,
  });

  return records.map((record) => ({
    id: record.id,
    name: getField<string>(record, "Name") || "",
    email: getField<string>(record, "Email (Contact DB)") || "",
    position: getField<string>(record, "Position") || "",
    eFname: getField<string>(record, "E_FNAME") || "",
    outreachOptIn: getField<string>(record, "Email Opt-in") !== "No",
    leadId: getField<string>(record, "Lead ID") || "",
  }));
}

export async function getAllContacts(): Promise<Contact[]> {
  const records = await fetchAllRecords(COUNSELOR_DB_BASE, CONTACTS_TABLE, {
    fields: ["Name", "Email (Contact DB)", "Position", "E_FNAME", "Email Opt-in", "Lead ID"],
  });

  return records.map((record) => ({
    id: record.id,
    name: getField<string>(record, "Name") || "",
    email: getField<string>(record, "Email (Contact DB)") || "",
    position: getField<string>(record, "Position") || "",
    eFname: getField<string>(record, "E_FNAME") || "",
    outreachOptIn: getField<string>(record, "Email Opt-in") !== "No",
    leadId: getField<string>(record, "Lead ID") || "",
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
