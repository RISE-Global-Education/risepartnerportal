import type { CounselorInvoice, InvoiceStatus } from "@/lib/counselor-invoices";
import InvoiceDownloadButton from "./InvoiceDownloadButton";

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  Paid: "bg-emerald-50 text-rise-green",
  Processing: "bg-amber-50 text-amber-700",
  Pending: "bg-rise-cream text-rise-brown",
};

function InvoiceAction({ invoice }: { invoice: CounselorInvoice }) {
  if (invoice.uploaded) {
    return <InvoiceDownloadButton billId={invoice.billId} fileName={invoice.fileName} />;
  }
  // An old bill that was paid before invoices were tracked here has nothing to show.
  if (invoice.status === "Paid") {
    return <span className="text-rise-brown">-</span>;
  }
  return (
    <button
      type="button"
      disabled
      title="Not uploaded yet"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed"
    >
      <span aria-hidden="true">&#8595;</span>
      Download
    </button>
  );
}

export default function InvoicesTab({ invoices }: { invoices: CounselorInvoice[] }) {
  const available = invoices.filter((i) => i.uploaded).length;
  const latest = invoices[0];
  // A 0% or missing rate is never shown: the card and the column disappear
  // when no invoice has a rate, and a single such month shows a dash.
  const rate = latest?.referralPercent ?? null;
  const showRateColumn = invoices.some((i) => i.referralPercent != null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-rise-black font-heading">Invoices</h2>
        <span className="text-sm text-rise-brown">
          {invoices.length} total &middot; {available} available
        </span>
      </div>

      {(rate != null || latest) && (
        <div className={`grid gap-4 mb-6 ${rate != null && latest ? "grid-cols-2" : "grid-cols-1"}`}>
          {rate != null && (
            <div className="bg-blue-50 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-blue-700 font-heading">{rate}%</p>
              <p className="text-sm mt-1 text-blue-700 opacity-80">Your Referral Rate</p>
            </div>
          )}
          {latest && (
            <div className="bg-emerald-50 rounded-xl p-5 text-center">
              <p className="text-3xl font-bold text-rise-green font-heading">
                {latest.billingMonth}
              </p>
              <p className="text-sm mt-1 text-rise-green opacity-80">
                Latest Invoice &middot; {latest.status}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-rise-green/20 bg-rise-green/5 px-5 py-4">
        <span aria-hidden="true" className="mt-0.5 h-7 w-7 shrink-0 rounded-md border-2 border-rise-green" />
        <div>
          <p className="text-sm font-semibold text-rise-green">Automatic Invoice Sync</p>
          <p className="text-sm text-rise-black/80 mt-0.5">
            Invoices are shared by the RISE accounts team and appear here automatically once
            uploaded. Each invoice is named by your Counselor ID.
          </p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-rise-brown">
          No invoices yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-rise-black font-heading">Your Invoices</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 font-medium text-rise-brown">Bill ID</th>
                  <th className="px-6 py-3 font-medium text-rise-brown">Month</th>
                  <th className="px-6 py-3 font-medium text-rise-brown">Students</th>
                  {showRateColumn && (
                    <th className="px-6 py-3 font-medium text-rise-brown">Referral %</th>
                  )}
                  <th className="px-6 py-3 font-medium text-rise-brown">Status</th>
                  <th className="px-6 py-3 font-medium text-rise-brown">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.billId}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-rise-black">{invoice.billId}</td>
                    <td className="px-6 py-4 text-rise-black">{invoice.billingMonth}</td>
                    <td className="px-6 py-4 text-rise-black">{invoice.studentCount}</td>
                    {showRateColumn && (
                      <td className="px-6 py-4 text-rise-black">
                        {invoice.referralPercent != null ? `${invoice.referralPercent}%` : "-"}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[invoice.status]}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <InvoiceAction invoice={invoice} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl bg-rise-cream px-5 py-4 text-sm text-rise-brown">
        <span className="font-semibold">Payment Processing:</span> Payments begin processing on the
        4th of every month and may take 3 to 5 business days to reflect in your account. For
        discrepancies, please contact RISE support.
      </div>
    </div>
  );
}
