import { google, type drive_v3 } from "googleapis";

// Read-only Drive access through an OAuth refresh token. The token belongs to a
// Google account that can view the shared invoice folder. Nothing here has a
// default: every value comes from the environment.

const FOLDER_MIME = "application/vnd.google-apps.folder";

// A runaway tree should not turn one cron run into thousands of API calls.
const MAX_FOLDERS = 200;

const SAFE_ID = /^[A-Za-z0-9_-]+$/;

export interface DriveInvoiceFile {
  id: string;
  name: string;
  createdTime: string | null;
}

export class DriveNotConfiguredError extends Error {}

/** The shared folder's ID, or null when it is not configured. */
export function getInvoicesFolderId(): string | null {
  const id = process.env.GOOGLE_DRIVE_INVOICES_FOLDER_ID?.trim();
  return id ? id : null;
}

function getDrive(): drive_v3.Drive {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new DriveNotConfiguredError(
      "Google Drive is not configured: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_DRIVE_REFRESH_TOKEN."
    );
  }
  const auth = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "https://developers.google.com/oauthplayground"
  );
  auth.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth });
}

/**
 * Walks the shared folder and every subfolder (one per month, such as
 * "NOVEMBER 2026"), breadth first, and returns every file found.
 */
export async function listInvoiceFiles(): Promise<DriveInvoiceFile[]> {
  const rootId = getInvoicesFolderId();
  if (!rootId) {
    throw new DriveNotConfiguredError("GOOGLE_DRIVE_INVOICES_FOLDER_ID is not set.");
  }
  if (!SAFE_ID.test(rootId)) {
    throw new DriveNotConfiguredError("GOOGLE_DRIVE_INVOICES_FOLDER_ID is not a valid Drive folder ID.");
  }

  const drive = getDrive();
  const files: DriveInvoiceFile[] = [];
  const queue: string[] = [rootId];
  let foldersVisited = 0;

  while (queue.length > 0) {
    if (foldersVisited >= MAX_FOLDERS) {
      console.warn(
        `[Invoices] Stopped after ${MAX_FOLDERS} folders with ${queue.length} left unvisited. Files in those folders were not scanned.`
      );
      break;
    }
    const folderId = queue.shift()!;
    foldersVisited += 1;

    let pageToken: string | undefined;
    do {
      const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType, createdTime)",
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      for (const file of res.data.files ?? []) {
        if (!file.id || !file.name) continue;
        if (file.mimeType === FOLDER_MIME) {
          queue.push(file.id);
        } else {
          files.push({ id: file.id, name: file.name, createdTime: file.createdTime ?? null });
        }
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  return files;
}

/** Downloads one file's bytes and reports its type. */
export async function downloadInvoiceFile(
  fileId: string
): Promise<{ data: Buffer; mimeType: string }> {
  const drive = getDrive();

  const meta = await drive.files.get({
    fileId,
    fields: "mimeType",
    supportsAllDrives: true,
  });
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );

  return {
    data: Buffer.from(res.data as ArrayBuffer),
    mimeType: meta.data.mimeType || "application/octet-stream",
  };
}
