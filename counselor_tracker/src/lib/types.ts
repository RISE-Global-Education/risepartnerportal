export type FunnelStage = "Lead" | "Application" | "Interview" | "Client";

export interface Counselor {
  id: string; // Airtable record ID from Base 2
  counselorId: string; // e.g. "C0012"
  companyName: string;
  firstName: string;
  email: string;
  phone: string;
  scholarshipAmount: number | null;
  referralAmount: number | null;
  poc: string[]; // RISE point(s) of contact
  pocRecordIds: string[]; // Linked contact record IDs from POC field
  country: string;
  capacity: string; // Expected Number field
  followUpStatus: string;
  studentInterview: string;
  shareBrochure: string;
  sharePayment: string;
  studentMixMaxAddin: string;
  mouUrl: string | null;
  slug: string; // auto-generated from company name
}

export interface Student {
  id: string; // Airtable record ID
  name: string;
  email: string;
  stage: FunnelStage;
  followUpStatus: string | null;
  dateEntered: string; // ISO date string
  source: "discovery" | "application"; // which table they came from
}

export interface Conversation {
  id: string;
  date: string;
  notes: string;
  attendee: string;
  companyName: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  position: string;
  eFname: string;
  outreachOptIn: boolean;
  leadId: string;
}

export interface PartnerData {
  counselor: Counselor;
  students: Student[];
  funnelCounts: Record<FunnelStage, number>;
  conversations?: Conversation[];
}
