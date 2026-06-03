import { fetchAllRecords, getField } from "@/lib/airtable";
import { cookies } from "next/headers";
import PastClient from "./PastClient";

const STUDENT_PIPELINE_BASE = "appyvj8Xh10kGWbJN";
const RESEARCH_SCHOLAR_TABLE = "tblpsa6QdGW9qmyll";
const STUDENT_INTERVIEW_EVENT_TYPE_ID = 5205635;

export interface MatchedRow {
  uid: string;
  airtableRecordId: string;
  applicantId: string;
  studentName: string;
  hostName: string;
  acceptanceSent: boolean;
  start: string;
  bookingCount: number;
  pocNotes: string;
}

export interface UnmatchedRow {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  hostName: string;
  start: string;
  bookingCount: number;
}

export interface NameMatchedRow {
  uid: string;
  airtableRecordId: string;
  attendeeName: string;
  attendeeEmail: string;
  hostName: string;
  start: string;
  bookingCount: number;
  matchedOn: "student" | "parent";
  applicantId: string;
  acceptanceSent: boolean;
  pocNotes: string;
}

async function fetchAllPastBookings() {
  const take = 100;
  const all: {
    uid: string;
    attendeeEmail: string;
    attendeeName: string;
    hostName: string;
    start: string;
  }[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      eventTypeId: String(STUDENT_INTERVIEW_EVENT_TYPE_ID),
      status: "past",
      take: String(take),
      skip: String((page - 1) * take),
      sortStart: "desc",
    });

    const res = await fetch(`https://api.cal.com/v2/bookings?${params}`, {
      headers: {
        Authorization: `Bearer ${process.env.CALCOM_API_KEY}`,
        "cal-api-version": "2026-02-25",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) break;

    const json = await res.json();
    for (const b of json.data ?? []) {
      const email = b.attendees?.[0]?.email ?? "";
      if (email) {
        all.push({
          uid: b.uid,
          attendeeEmail: email.toLowerCase().trim(),
          attendeeName: b.attendees?.[0]?.name ?? "—",
          hostName: b.hosts?.[0]?.name ?? "—",
          start: b.start,
        });
      }
    }

    hasMore = json.pagination?.hasNextPage ?? false;
    page++;
  }

  return all;
}

export default async function PastPage() {
  const cookieStore = await cookies();
  const teamName = cookieStore.get("team_auth")?.value;
  const isCeo = !!cookieStore.get("ceo_auth")?.value;
  const pocName = teamName ?? (isCeo ? "Admin" : "Unknown");

  const [records, bookings] = await Promise.all([
    fetchAllRecords(STUDENT_PIPELINE_BASE, RESEARCH_SCHOLAR_TABLE, {
      fields: ["Applicant ID", "Name", "Student Email ID", "Parent Email ID", "Parent Name", "Acceptances Email Sent Time", "Follow Up Status", "Interview POC Notes"],
    }),
    fetchAllPastBookings(),
  ]);

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();

  // Separate maps for student and parent emails
  const recordByStudentEmail = new Map<string, typeof records[number]>();
  const recordByParentEmail = new Map<string, typeof records[number]>();
  for (const r of records) {
    const studentEmail = normalize(getField<string>(r, "Student Email ID") ?? "");
    const parentEmail = normalize(getField<string>(r, "Parent Email ID") ?? "");
    if (studentEmail) recordByStudentEmail.set(studentEmail, r);
    if (parentEmail && !recordByParentEmail.has(parentEmail)) recordByParentEmail.set(parentEmail, r);
  }

  // Count bookings per email and deduplicate (sorted desc → first = most recent)
  const emailCounts = new Map<string, number>();
  for (const b of bookings) {
    const email = normalize(b.attendeeEmail);
    emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
  }

  const seenEmails = new Set<string>();
  const dedupedBookings: typeof bookings = [];
  for (const b of bookings) {
    const email = normalize(b.attendeeEmail);
    if (seenEmails.has(email)) continue;
    seenEmails.add(email);
    dedupedBookings.push(b);
  }

  function buildMatchedRow(b: typeof bookings[number], record: typeof records[number]): MatchedRow | null {
    const followUpStatus = getField<string>(record, "Follow Up Status") ?? "";
    if (followUpStatus === "Drop" || followUpStatus === "Client") return null;
    return {
      uid: b.uid,
      airtableRecordId: record.id,
      applicantId: getField<string>(record, "Applicant ID") ?? "—",
      studentName: getField<string>(record, "Name") ?? "—",
      hostName: b.hostName,
      acceptanceSent: !!(getField<string>(record, "Acceptances Email Sent Time")),
      start: b.start,
      bookingCount: emailCounts.get(normalize(b.attendeeEmail)) ?? 1,
      pocNotes: (getField<string>(record, "Interview POC Notes") ?? "").trim(),
    };
  }

  const matchedRaw: MatchedRow[] = [];
  const unmatchedPass1: typeof bookings = [];

  // Pass 1: match by student email
  for (const b of dedupedBookings) {
    const record = recordByStudentEmail.get(normalize(b.attendeeEmail));
    if (record) {
      const row = buildMatchedRow(b, record);
      if (row) matchedRaw.push(row);
    } else {
      unmatchedPass1.push(b);
    }
  }

  // Pass 2: match remaining by parent email
  const unmatchedPass2: typeof bookings = [];
  for (const b of unmatchedPass1) {
    const record = recordByParentEmail.get(normalize(b.attendeeEmail));
    if (record) {
      const row = buildMatchedRow(b, record);
      if (row) matchedRaw.push(row);
    } else {
      unmatchedPass2.push(b);
    }
  }

  // Build name maps for pass 3
  const normalizeName = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const recordByStudentName = new Map<string, typeof records[number]>();
  const recordByParentName = new Map<string, typeof records[number]>();
  for (const r of records) {
    const studentName = normalizeName(getField<string>(r, "Name") ?? "");
    const parentName = normalizeName(getField<string>(r, "Parent Name") ?? "");
    if (studentName) recordByStudentName.set(studentName, r);
    if (parentName && !recordByParentName.has(parentName)) recordByParentName.set(parentName, r);
  }

  // Pass 3: match remaining by attendee name vs student name or parent name.
  // Group bookings by the Airtable record their name maps to.
  // Same name → same record = same person with multiple emails → keep most recent (bookings sorted desc).
  // Same name → different records = different people with the same name → ambiguous → unmatched.
  // No record match → unmatched.
  type BookingEntry = typeof unmatchedPass2[number];
  const nameGroups = new Map<string, { record: typeof records[number]; matchedOn: "student" | "parent"; bookings: BookingEntry[] }>();

  for (const b of unmatchedPass2) {
    const name = normalizeName(b.attendeeName);
    const studentRecord = recordByStudentName.get(name);
    const parentRecord = recordByParentName.get(name);
    const record = studentRecord ?? parentRecord;

    if (!record) continue;

    const existing = nameGroups.get(name);
    if (!existing) {
      nameGroups.set(name, { record, matchedOn: studentRecord ? "student" : "parent", bookings: [b] });
    } else if (existing.record.id === record.id) {
      existing.bookings.push(b);
    }
    // different record for same name → ambiguous, leave out of map (handled below)
  }

  // Track which names mapped to conflicting records → genuinely ambiguous
  const ambiguousNames = new Set<string>();
  for (const b of unmatchedPass2) {
    const name = normalizeName(b.attendeeName);
    const studentRecord = recordByStudentName.get(name);
    const parentRecord = recordByParentName.get(name);
    const record = studentRecord ?? parentRecord;
    if (!record) continue;
    const group = nameGroups.get(name);
    if (group && group.record.id !== record.id) ambiguousNames.add(name);
  }

  const nameMatched: NameMatchedRow[] = [];
  const unmatched: UnmatchedRow[] = [];

  const handledNames = new Set<string>();
  for (const b of unmatchedPass2) {
    const name = normalizeName(b.attendeeName);
    const group = nameGroups.get(name);

    if (!group || ambiguousNames.has(name)) {
      unmatched.push({
        uid: b.uid,
        attendeeName: b.attendeeName,
        attendeeEmail: b.attendeeEmail,
        hostName: b.hostName,
        start: b.start,
        bookingCount: emailCounts.get(normalize(b.attendeeEmail)) ?? 1,
      });
      continue;
    }

    if (handledNames.has(name)) continue;
    handledNames.add(name);

    // Most recent booking is first (bookings sorted desc), count all bookings across all emails for this name
    const mostRecent = group.bookings[0];
    const totalCount = group.bookings.reduce(
      (sum, bk) => sum + (emailCounts.get(normalize(bk.attendeeEmail)) ?? 1),
      0
    );
    const record = group.record;
    nameMatched.push({
      uid: mostRecent.uid,
      airtableRecordId: record.id,
      attendeeName: mostRecent.attendeeName,
      attendeeEmail: mostRecent.attendeeEmail,
      hostName: mostRecent.hostName,
      start: mostRecent.start,
      bookingCount: totalCount,
      matchedOn: group.matchedOn,
      applicantId: getField<string>(record, "Applicant ID") ?? "—",
      acceptanceSent: !!(getField<string>(record, "Acceptances Email Sent Time")),
      pocNotes: (getField<string>(record, "Interview POC Notes") ?? "").trim(),
    });
  }

  nameMatched.sort((a, b) => {
    if (!a.acceptanceSent && b.acceptanceSent) return -1;
    if (a.acceptanceSent && !b.acceptanceSent) return 1;
    return b.start.localeCompare(a.start);
  });

  // Sort: No (acceptance not sent) first, then descending by start time within each group
  const matched = matchedRaw.sort((a, b) => {
    if (!a.acceptanceSent && b.acceptanceSent) return -1;
    if (a.acceptanceSent && !b.acceptanceSent) return 1;
    return b.start.localeCompare(a.start);
  });

  return (
    <div>
      <p className="text-sm text-rise-brown mb-4">
        {matched.length} matched interview{matched.length !== 1 ? "s" : ""}
        {nameMatched.length > 0 && (
          <>, <span className="text-rise-black font-medium">{nameMatched.length}</span> name-only match{nameMatched.length !== 1 ? "es" : ""}</>
        )}
        {unmatched.length > 0 && (
          <>, <span className="text-rise-black font-medium">{unmatched.length}</span> not in pipeline</>
        )}
      </p>
      <PastClient matched={matched} nameMatched={nameMatched} unmatched={unmatched} pocName={pocName} />
    </div>
  );
}
