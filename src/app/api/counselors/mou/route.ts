import { NextRequest, NextResponse } from "next/server";
import { updateRecord } from "@/lib/airtable";

const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";
const COUNSELOR_DB_TABLE = "tblxCiUOdN435Zfju";

// Airtable attachment upload: first upload to Airtable's content URL, then link
const AIRTABLE_UPLOAD_URL = "https://content.airtable.com/v0";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const secret = formData.get("secret") as string;
  const recordId = formData.get("recordId") as string;
  const file = formData.get("file") as File;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!recordId || !file) {
    return NextResponse.json(
      { error: "recordId and file are required" },
      { status: 400 }
    );
  }

  const token = process.env.AIRTABLE_COUNSELOR_TOKEN;

  // Step 1: Get upload URL from Airtable
  const uploadReqRes = await fetch(
    `${AIRTABLE_UPLOAD_URL}/${COUNSELOR_DB_BASE}/${recordId}/MOU/uploadAttachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: file.type || "application/pdf",
        filename: file.name,
      }),
    }
  );

  if (!uploadReqRes.ok) {
    // Fallback: use URL-based attachment by converting file to data URL
    // Airtable also accepts attachments as URL references
    // For simplicity, we'll update the MOU field with the attachment directly
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type || "application/pdf"};base64,${base64}`;

    // Airtable doesn't accept data URLs directly, so use a simpler approach:
    // We'll use the standard Airtable attachment update
    // Airtable attachments can be set via URL - we need a publicly accessible URL
    // Since we can't host the file, we'll use the multipart upload approach

    return NextResponse.json(
      { error: "Upload failed. Please try uploading directly in Airtable." },
      { status: 500 }
    );
  }

  const { uploadUrl, id: attachmentId } = await uploadReqRes.json();

  // Step 2: Upload file content to the upload URL
  const fileBuffer = await file.arrayBuffer();
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/pdf",
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    return NextResponse.json(
      { error: "File upload failed" },
      { status: 500 }
    );
  }

  // Step 3: Commit the attachment to the record
  const record = await updateRecord(
    COUNSELOR_DB_BASE,
    COUNSELOR_DB_TABLE,
    recordId,
    { MOU: [{ id: attachmentId }] },
    token
  );

  return NextResponse.json({ success: true, record });
}
