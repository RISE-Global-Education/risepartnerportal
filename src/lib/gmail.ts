import { google, type gmail_v1 } from "googleapis";
import { cleanHeader, encodeHeader } from "./mime";

// The one place the portal sends mail from. Used by the send-email route and by
// the invoice emails. Credentials come only from the environment:
// GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and GMAIL_FROM.
//
// The Gmail OAuth client is separate from the one Drive uses (GOOGLE_CLIENT_ID and
// GOOGLE_CLIENT_SECRET), and a refresh token only works with the client that issued
// it. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are used here only when the
// GMAIL_ pair is not set, which is how this worked before the clients were split.

let cachedGmail: gmail_v1.Gmail | null = null;

function getGmail(): gmail_v1.Gmail {
  if (!cachedGmail) {
    const clientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(
        "Gmail is not configured: set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN."
      );
    }
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    cachedGmail = google.gmail({ version: "v1", auth: oauth2Client });
  }
  return cachedGmail;
}

export interface OutgoingEmail {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}

function buildRawMessage(email: OutgoingEmail, from: string): string {
  const lines = [
    `From: ${cleanHeader(from)}`,
    `To: ${cleanHeader(email.to)}`,
    email.cc ? `Cc: ${cleanHeader(email.cc)}` : null,
    email.bcc ? `Bcc: ${cleanHeader(email.bcc)}` : null,
    `Subject: ${encodeHeader(email.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    email.body,
  ]
    .filter((line) => line !== null)
    .join("\r\n");

  return Buffer.from(lines).toString("base64url");
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  const from = process.env.GMAIL_FROM;
  if (!from) throw new Error("GMAIL_FROM is not set.");

  await getGmail().users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawMessage(email, from) },
  });
}
