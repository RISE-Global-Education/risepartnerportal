import { NextRequest, NextResponse } from "next/server";

const BASE = "appFavjto15k519od";
const TABLE = "tblubNgMLWtH4pzGf";
const AT_URL = `https://api.airtable.com/v0/${BASE}/${TABLE}`;

const WC_INTEREST_TABLE = "tblb9IgCjQh288AVG";
const WC_INTEREST_URL = `https://api.airtable.com/v0/${BASE}/${WC_INTEREST_TABLE}`;

const WEBHOOK = "https://hook.us2.make.com/pul9vm6a8d7cdlr1pujktst9e9tpq579";

async function findByEmail(email: string) {
  const params = new URLSearchParams({
    filterByFormula: `{Email ID} = "${email.toLowerCase().trim()}"`,
    maxRecords: "1",
  });
  const res = await fetch(`${AT_URL}?${params}`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.records?.[0] ?? null;
}

async function createRecord(name: string, email: string, rate: string, interviewDate: string | null, interviewNotes: string | null, status: string) {
  const fields: Record<string, string> = {
    "Email ID": email.toLowerCase().trim(),
    "Name": name,
    "Rate": rate,
    "Contract Status": status,
  };
  if (interviewDate) fields["Interview Date"] = interviewDate;
  if (interviewNotes) fields["Interview Notes"] = interviewNotes;

  const res = await fetch(AT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

// `status` is omitted (not just falsy-checked) when the caller doesn't want to touch the
// field — e.g. "Add Notes" on a record that's already "Sent" shouldn't downgrade it.
async function updateRecord(recordId: string, rate: string, interviewDate: string | null, interviewNotes: string | null, status?: string) {
  const fields: Record<string, string> = { "Rate": rate };
  if (status) fields["Contract Status"] = status;
  if (interviewDate) fields["Interview Date"] = interviewDate;
  if (interviewNotes) fields["Interview Notes"] = interviewNotes;

  const res = await fetch(`${AT_URL}/${recordId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

async function updateWCInterestForm(email: string, interviewNotes: string | null) {
  const params = new URLSearchParams({
    filterByFormula: `{Email ID} = "${email.toLowerCase().trim()}"`,
    maxRecords: "1",
  });
  const findRes = await fetch(`${WC_INTEREST_URL}?${params}`, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
    cache: "no-store",
  });
  if (!findRes.ok) return;
  const findData = await findRes.json();
  const record = findData.records?.[0];
  if (!record) return;

  const fields: Record<string, string> = { "R2 Status": "Contract Sent" };
  if (interviewNotes) fields["R2 Notes"] = interviewNotes;

  await fetch(`${WC_INTEREST_URL}/${record.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
}

async function triggerWebhook(name: string, email: string, rate: string, interviewDate: string | null, interviewNotes: string | null) {
  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, rate, interviewDate, interviewNotes }),
  });
  return res.ok;
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const record = await findByEmail(email);
  if (!record) return NextResponse.json({ exists: false });

  return NextResponse.json({
    exists: true,
    rate: record.fields["Rate"] ?? null,
    recordId: record.id,
  });
}

// action: "send" (default) sends the contract: create/update record, set Contract
// Status to "Sent", trigger the webhook (docx generation + email), and mark the WC
// Interest Form record "Contract Sent". action: "notes" just records interview notes:
// create/update the record without firing the webhook or touching the WC Interest
// Form, and set Contract Status to "Not Sent - Notes Added" — unless a contract was
// already sent, in which case the status is left as "Sent".
export async function POST(req: NextRequest) {
  const { name, email, rate, interviewDate, interviewNotes, action } = await req.json();
  if (!name || !email || !rate) {
    return NextResponse.json({ error: "name, email and rate required" }, { status: 400 });
  }

  const notesOnly = action === "notes";
  const record = await findByEmail(email);

  const status = notesOnly
    ? (record?.fields["Contract Status"] === "Sent" ? undefined : "Not Sent - Notes Added")
    : "Sent";

  let ok: boolean;
  if (record) {
    ok = await updateRecord(record.id, rate, interviewDate ?? null, interviewNotes ?? null, status);
  } else {
    ok = await createRecord(name, email, rate, interviewDate ?? null, interviewNotes ?? null, status ?? "Not Sent - Notes Added");
  }

  if (!ok) return NextResponse.json({ error: "Airtable update failed" }, { status: 502 });

  if (notesOnly) {
    return NextResponse.json({ ok: true });
  }

  await Promise.all([
    triggerWebhook(name, email, rate, interviewDate ?? null, interviewNotes ?? null),
    updateWCInterestForm(email, interviewNotes ?? null),
  ]);

  return NextResponse.json({ ok: true });
}
