import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/gmail";

export async function POST(req: NextRequest) {
  try {
    const { to, cc, bcc, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: "Missing required fields: to, subject, body" }, { status: 400 });
    }

    await sendEmail({ to, cc, bcc, subject, body });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-email]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
