import { NextRequest, NextResponse } from "next/server";
import { getInvoiceFileRef } from "@/lib/counselor-invoices";
import { downloadInvoiceFile, DriveNotConfiguredError } from "@/lib/drive-invoices";
import { BILL_ID_FORMAT } from "@/lib/bill-id";
import { canAccessCounselorInvoices } from "@/lib/partner-access";

/** Strips quotes, backslashes and line breaks so a name cannot break out of the header. */
function safeFileName(name: string | null, fallback: string): string {
  const cleaned = (name ?? "").replace(/["\\\r\n]/g, "").trim();
  return cleaned || fallback;
}

function contentDisposition(fileName: string): string {
  // The plain filename is ASCII only; filename* carries the real name.
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  const { billId } = await params;
  if (!BILL_ID_FORMAT.test(billId)) return notFound();

  const ref = await getInvoiceFileRef(billId);
  if (!ref) return notFound();

  // Authorization comes before any Drive call. Anyone who is not this
  // counselor or staff gets the same 404 as a bill that does not exist.
  if (!(await canAccessCounselorInvoices(ref.counselorId))) return notFound();

  try {
    const { data, mimeType } = await downloadInvoiceFile(ref.driveFileId);
    const fileName = safeFileName(ref.fileName, `${ref.billId}.pdf`);

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": contentDisposition(fileName),
        "Content-Length": String(data.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[Invoices] Download failed:", err);
    const message =
      err instanceof DriveNotConfiguredError
        ? "Invoice downloads are not available right now."
        : "We could not fetch this invoice. Please try again shortly.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
