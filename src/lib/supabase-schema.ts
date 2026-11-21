/**
 * Table and column names for portal data that lives in Supabase alongside
 * the RISE LMS tables — the migration counterpart to lib/airtable.ts,
 * applying the same discipline lms-schema.ts already applies to the LMS
 * tables in this same database: a renamed column is a one-line fix here,
 * not a hunt through the data layer.
 *
 * This is a separate file from lms-schema.ts on purpose. The two cover
 * unrelated domains — counselor/partner data here, RISE LMS progress data
 * there — even though both physically live in the same Postgres database
 * and share its connection pool. Reads and writes here go through
 * lib/lms-db.ts's query()/mutate() rather than opening a second pool to the
 * same database; only its name is LMS-specific, not its plumbing.
 *
 * counselor_discovery_calls, counselor_applications and brochure_downloads
 * also exist in this database (from an earlier migration pass) but are
 * deliberately unused — the portal reads those three straight from Airtable,
 * since it never writes to them and Airtable is always live, so a Supabase
 * mirror only adds staleness with no correctness benefit.
 *
 * Counselors, Contacts and Conversations are the opposite case: the portal
 * writes these itself, so they're created in Supabase directly. Only
 * Counselors also gets pushed to Airtable (synchronously, on create) —
 * Contacts and Conversations exist in Supabase only from here on; nothing
 * new ever reaches Airtable for those two. New rows for both get a
 * synthetic 'native:<uuid>' placeholder in airtable_record_id (still
 * NOT NULL/UNIQUE in the schema) since there's no real Airtable record to
 * point at; only legacy rows from before this change carry a real one.
 *
 * Every name below was verified against the live schema with
 * `node scripts/inspect-lms-schema.mjs` — re-run it after any Supabase change.
 */

export const COUNSELORS = {
  table: "counselors",
  id: "id", // the "PR12345" business code — also the primary key
  airtableRecordId: "airtable_record_id",
  counselerUuid: "counseler_uuid", // sic — the typo already lives in the schema
  companyName: "company_name",
  email: "email",
  allEmails: "all_emails",
  country: "country",
  partnerType: "partner_type",
  isWhitelabel: "is_whitelabel", // nullable boolean (null = not set) — must be added by migration
  followUpStatus: "follow_up_status",
  scholarshipAmount: "scholarship_amount",
  referralPercentage: "referral_percentage",
  workshopType: "workshop_type",
  studentInterview: "student_interview",
  shareBrochure: "share_brochure",
  sharePayment: "share_payment",
  studentMixmaxAddin: "student_mixmax_addin",
  pocRise: "poc_rise",
  expectedStudentCount: "expected_student_count",
  lastConversationDate: "last_conversation_date",
  partnerPassword: "partner_password",
  createdAt: "created_at", // Supabase row-insert time
} as const;

export const COUNSELOR_CONTACTS = {
  table: "counselor_contacts",
  id: "id",
  airtableRecordId: "airtable_record_id",
  counselorId: "counselor_id",
  counselerUuid: "counseler_uuid", // sic — matches counselors.counseler_uuid
  leadId: "lead_id",
  name: "name",
  email: "email",
  phoneNumber: "phone_number",
  position: "position",
  firstName: "first_name", // sic — this is the Airtable "E_FNAME" field
  emailOptIn: "email_opt_in",
} as const;

// The no-send list: emails that have unsubscribed. Record-keeping only — the
// portal never reads this to block a send. Created by
// scripts/create-email-unsubscribes.sql.
export const EMAIL_UNSUBSCRIBES = {
  table: "email_unsubscribes",
  id: "id",
  email: "email", // stored lowercased; unique
  name: "name",
  companyName: "company_name",
  country: "country",
  risePoc: "rise_poc", // text[] — same multi-select as the Add Partner form
  createdAt: "created_at",
} as const;

// Counselor referral invoices shown on the partner portal's Invoices tab.
// Separate from the LMS "invoices" table (mentor and writing coach bills).
// Created by scripts/create-counselor-invoices.sql.
export const COUNSELOR_INVOICES = {
  table: "counselor_invoices",
  id: "id",
  billId: "bill_id", // counselor ID and month, e.g. PR1126_October2026, unique, also the Drive file name
  counselorId: "counselor_id", // matches counselors.id
  billingMonth: "billing_month", // e.g. "October 2026", matches Month in the Airtable referral view
  paymentStatus: "payment_status", // Pending | Processing | Paid
  paidAt: "paid_at",
  driveFileId: "invoice_drive_file_id", // never sent to the browser
  fileName: "invoice_file_name",
  uploadedAt: "invoice_uploaded_at",
} as const;

export const COUNSELOR_CONVERSATIONS = {
  table: "counselor_conversations",
  id: "id",
  airtableRecordId: "airtable_record_id",
  counselorId: "counselor_id",
  counselerUuid: "counseler_uuid", // sic — matches counselors.counseler_uuid
  title: "title",
  date: "date",
  attendee: "attendee",
  notes: "notes", // intent is prefix-encoded in here — see conversations.ts
} as const;
