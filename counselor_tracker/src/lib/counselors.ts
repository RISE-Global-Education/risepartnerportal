import { fetchAllRecords, getField } from "./airtable";
import type { Counselor } from "./types";

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
      "Company Name",
      "Counselor ID",
      "First Name",
      "Email ID (s)",
      "Phone Number",
      "Scholarship Amount",
      "Referral Amount",
      "POC (RISE)",
      "Country",
      "Expected Number",
      "Follow Up Status",
      "Student Interview",
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
        poc: getField<string[]>(record, "POC (RISE)") || [],
        country: getField<string>(record, "Country") || "",
        capacity: getField<string>(record, "Expected Number") || "",
        followUpStatus: getField<string>(record, "Follow Up Status") || "",
        studentInterview: getField<string>(record, "Student Interview") || "",
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

  // First try exact slug match (partner view)
  const exactMatch = counselors.find((c) => c.slug === slug);
  if (exactMatch) {
    return { counselor: exactMatch, isCeoView: false };
  }

  // Try to find a CEO view match (slug-counselorId)
  for (const counselor of counselors) {
    const ceoSlug = `${counselor.slug}-${counselor.counselorId.toLowerCase()}`;
    if (slug.toLowerCase() === ceoSlug) {
      return { counselor, isCeoView: true };
    }
  }

  return null;
}

// Get the Counselor Records from Base 1 that match a counselor from Base 2
// Returns the Airtable record IDs of linked students
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
