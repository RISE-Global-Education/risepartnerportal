"use client";

import { useState, useEffect } from "react";

const RATE_REGEX = /^\d{2,3}\s+(USD|GBP|INR)$/;

interface Props {
  initialName?: string;
  initialEmail?: string;
  onClose: () => void;
}

export default function ContractPopup({ initialName = "", initialEmail = "", onClose }: Props) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [rate, setRate] = useState("");
  const [rateError, setRateError] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  // confirmation state — set when existing record found
  const [existingRate, setExistingRate] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  const rateValid = RATE_REGEX.test(rate.trim());

  useEffect(() => {
    setChecked(false);
    setExistingRate(null);
  }, [email]);

  function handleRateChange(val: string) {
    setRate(val);
    if (val.trim() && !RATE_REGEX.test(val.trim())) {
      setRateError("Format: e.g. 50 USD, 100 GBP, 500 INR");
    } else {
      setRateError("");
    }
  }

  async function handleSendClick() {
    if (!checked) {
      setSending(true);
      setSendError("");
      try {
        const res = await fetch(`/api/mentor-contract?email=${encodeURIComponent(email.trim())}`);
        const data = await res.json();
        setChecked(true);
        if (data.exists) {
          setExistingRate(data.rate);
          setSending(false);
          return;
        }
      } catch {
        setSendError("Failed to check record. Please try again.");
        setSending(false);
        return;
      }
      await send();
    } else {
      await send();
    }
  }

  async function send() {
    setSending(true);
    setSendError("");
    try {
      const res = await fetch("/api/mentor-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email.trim(),
          rate: rate.trim(),
          interviewDate: interviewDate || null,
          interviewNotes: interviewNotes || null,
        }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setSendError("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const showConfirmation = checked && existingRate !== null && !sent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-rise-black">Send Contract</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-1 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rise-green"
            />
          </div>
          <div>
            <label className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rise-green"
            />
          </div>
          <div>
            <label className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-1 block">Rate</label>
            <input
              type="text"
              value={rate}
              onChange={(e) => handleRateChange(e.target.value)}
              placeholder="e.g. 50 USD"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 ${
                rateError ? "border-red-300 focus:ring-red-300" : "border-gray-300 focus:ring-rise-green"
              }`}
            />
            {rateError && <p className="text-xs text-red-500 mt-1">{rateError}</p>}
          </div>
          <div>
            <label className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-1 block">Interview Date</label>
            <input
              type="date"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rise-green"
            />
          </div>
          <div>
            <label className="text-xs text-rise-brown font-medium uppercase tracking-wide mb-1 block">Interview Notes</label>
            <textarea
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              placeholder="Add any notes from the interview..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rise-green resize-none"
            />
          </div>

          {showConfirmation && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
              You have already sent them a contract with rate <span className="font-semibold">{existingRate}</span>. Are you sure you want to send again with rate <span className="font-semibold">{rate.trim()}</span>?
            </div>
          )}

          {sendError && <p className="text-xs text-red-500">{sendError}</p>}

          {sent ? (
            <p className="text-sm text-center text-rise-green font-medium py-2">Contract sent!</p>
          ) : showConfirmation ? (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => send()}
                disabled={sending}
                className="flex-1 bg-gray-800 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? "Sending…" : "Yes, Send"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSendClick}
              disabled={!name.trim() || !email.trim() || !rateValid || sending}
              className="w-full bg-gray-800 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? "Checking…" : "Send Contract"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
