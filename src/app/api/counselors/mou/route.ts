import { NextRequest, NextResponse } from "next/server";

const COUNSELOR_DB_BASE = "appU2cJpIWIHQI4up";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const secret = formData.get("secret") as string;
  const recordId = formData.get("recordId") as string;
  const file = formData.get("file") as File;

  if (secret !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!recordId || !file) {
    return NextResponse.json({ error: "recordId and file are required" }, { status: 400 });
  }

  const fileBuffer = await file.arrayBuffer();

  if (fileBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: "File exceeds 5 MB. Please compress the PDF and try again." },
      { status: 413 }
    );
  }

  const base64 = Buffer.from(fileBuffer).toString("base64");
  const token = process.env.AIRTABLE_COUNSELOR_TOKEN;

  const res = await fetch(
    `https://content.airtable.com/v0/${COUNSELOR_DB_BASE}/${recordId}/MOU/uploadAttachment`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contentType: file.type || "application/pdf",
        file: base64,
        filename: file.name,
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[MOU upload] Airtable error ${res.status}:`, errText);
    return NextResponse.json(
      { error: `Upload failed (${res.status}). Please try again.` },
      { status: 500 }
    );
  }

  const record = await res.json();
  return NextResponse.json({ success: true, record });
}
