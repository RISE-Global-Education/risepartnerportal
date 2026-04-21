import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

function buildRawMessage({
  to,
  cc,
  bcc,
  subject,
  body,
  from,
}: {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  from: string;
}) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    bcc ? `Bcc: ${bcc}` : null,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ]
    .filter((l) => l !== null)
    .join("\r\n");

  return Buffer.from(lines).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {
    const { to, cc, bcc, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "Missing required fields: to, subject, body" }, { status: 400 });
    }

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const raw = buildRawMessage({
      from: process.env.GMAIL_FROM!,
      to,
      cc,
      bcc,
      subject,
      body,
    });

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-email]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
