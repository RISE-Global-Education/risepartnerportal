"use client";

import { useState } from "react";
import WCContractPopup from "./WCContractPopup";

export interface WCBooking {
  uid: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  university: string | null;
  academicBackground: string | null;
  hostName: string;
  start: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toUTCString().replace("GMT", "UTC");
}

export default function WCDetailPopup({ booking, onClose }: { booking: WCBooking; onClose: () => void }) {
  const [showContract, setShowContract] = useState(false);
  const [confirmFail, setConfirmFail] = useState(false);
  const [failing, setFailing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [failError, setFailError] = useState("");

  async function handleFail() {
    setFailing(true);
    setFailError("");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "kalyani@riseglobaleducation.com",
          subject: `R2 Failed ${booking.attendeeName} | WC Interviews | RISE Research`,
          body: `Hey,\n\n${booking.attendeeName} did not pass WC Interview Round 2.\nPlease make a note of it.\n\nBest,\nWahiq I\nRISE Research`,
        }),
      });
      if (!res.ok) throw new Error();
      setFailed(true);
    } catch {
      setFailError("Failed to send email. Please try again.");
    } finally {
      setFailing(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-rise-black">Interview Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Name</dt>
              <dd className="text-rise-black font-medium">{booking.attendeeName}</dd>
            </div>
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Email</dt>
              <dd className="text-rise-black break-all">{booking.attendeeEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Phone</dt>
              <dd className="text-rise-black">{booking.attendeePhone ?? <span className="text-gray-300">—</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">University</dt>
              <dd className="text-rise-black">{booking.university ?? <span className="text-gray-300">—</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Host</dt>
              <dd className="text-rise-black">{booking.hostName}</dd>
            </div>
            <div>
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Meeting Time (UTC)</dt>
              <dd className="text-rise-black">{formatDateTime(booking.start)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-0.5">Academic Background</dt>
              <dd className="text-rise-black">{booking.academicBackground ?? <span className="text-gray-300">—</span>}</dd>
            </div>
          </dl>

          {failError && <p className="text-xs text-red-500 mt-3">{failError}</p>}

          {confirmFail && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
              <p className="mb-3">Are you sure you want to Fail <span className="font-semibold">{booking.attendeeName}</span>? Team will be informed accordingly.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmFail(false)}
                  className="flex-1 border border-red-300 text-red-700 text-sm font-medium py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFail}
                  disabled={failing || failed}
                  className="flex-1 bg-red-600 text-white text-sm font-medium py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {failing ? "Sending…" : failed ? "Email sent!" : "Yes, Fail"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-gray-100 flex gap-3">
            {failed ? (
              <p className="flex-1 text-sm text-center text-red-600 font-medium py-2">Email sent!</p>
            ) : (
              <button
                onClick={() => setConfirmFail(true)}
                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Fail
              </button>
            )}
            <button
              onClick={() => setShowContract(true)}
              className="flex-1 bg-gray-800 text-white hover:bg-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
            >
              Send Contract
            </button>
          </div>
        </div>
      </div>

      {showContract && (
        <WCContractPopup
          initialName={booking.attendeeName}
          initialEmail={booking.attendeeEmail}
          onClose={() => setShowContract(false)}
        />
      )}
    </>
  );
}
