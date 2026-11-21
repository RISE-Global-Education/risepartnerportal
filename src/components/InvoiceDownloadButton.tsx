"use client";

import { useState } from "react";

// Downloads through the portal, which streams the file from Drive. The browser
// never sees a Drive link or file ID.
export default function InvoiceDownloadButton({
  billId,
  fileName,
}: {
  billId: string;
  fileName: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(billId)}/file`);
      if (!res.ok) {
        let message = "The download failed. Please try again.";
        try {
          const body = await res.json();
          if (body?.error) message = body.error;
        } catch {
          // Keep the generic message when the body is not JSON.
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName || `${billId}.pdf`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setError("The download failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rise-green border border-rise-green rounded-lg hover:bg-rise-green/5 transition-colors disabled:opacity-60"
      >
        <span aria-hidden="true">&#8595;</span>
        {busy ? "Downloading..." : "Download"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
