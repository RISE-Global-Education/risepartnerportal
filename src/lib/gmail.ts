import { google, type gmail_v1 } from "googleapis";
import { cleanHeader, encodeHeader } from "./mime";

// One place the portal sends mail from. The sender is given its credentials, so
// two features can use two different Gmail accounts side by side without their
// environment variables colliding:
//
// - defaultGmailConfig(): the original setup, used by /api/send-email (mentor
//   contracts, MOUs). GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
//   and GMAIL_FROM, exactly as before.
// - invoiceGmailConfig(): the counselor invoice emails. INVOICE_GMAIL_CLIENT_ID,
//   INVOICE_GMAIL_CLIENT_SECRET, INVOICE_GMAIL_REFRESH_TOKEN and INVOICE_GMAIL_FROM.
//
// A refresh token only works with the OAuth client that issued it, so each set
// must be kept together.

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  from: string;
}

interface GmailEnvNames {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  from: string;
}

function readConfig(names: GmailEnvNames): GmailConfig {
  const clientId = process.env[names.clientId];
  const clientSecret = process.env[names.clientSecret];
  const refreshToken = process.env[names.refreshToken];
  const from = process.env[names.from];
  if (!clientId || !clientSecret || !refreshToken || !from) {
    throw new Error(
      `Gmail is not configured: set ${names.clientId}, ${names.clientSecret}, ${names.refreshToken} and ${names.from}.`
    );
  }
  return { clientId, clientSecret, refreshToken, from };
}

export function defaultGmailConfig(): GmailConfig {
  return readConfig({
    clientId: "GOOGLE_CLIENT_ID",
    clientSecret: "GOOGLE_CLIENT_SECRET",
    refreshToken: "GMAIL_REFRESH_TOKEN",
    from: "GMAIL_FROM",
  });
}

export function invoiceGmailConfig(): GmailConfig {
  return readConfig({
    clientId: "INVOICE_GMAIL_CLIENT_ID",
    clientSecret: "INVOICE_GMAIL_CLIENT_SECRET",
    refreshToken: "INVOICE_GMAIL_REFRESH_TOKEN",
    from: "INVOICE_GMAIL_FROM",
  });
}

// One Gmail client per credential set, so the two features never share one.
const gmailClients = new Map<string, gmail_v1.Gmail>();

function getGmail(config: GmailConfig): gmail_v1.Gmail {
  const key = `${config.clientId}|${config.refreshToken}`;
  let gmail = gmailClients.get(key);
  if (!gmail) {
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: config.refreshToken });
    gmail = google.gmail({ version: "v1", auth: oauth2Client });
    gmailClients.set(key, gmail);
  }
  return gmail;
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

export async function sendEmail(email: OutgoingEmail, config: GmailConfig): Promise<void> {
  await getGmail(config).users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawMessage(email, config.from) },
  });
}
