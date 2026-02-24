"use client";

import { useState } from "react";

const POC_OPTIONS = ["Yash", "Shreyans", "Prachi"];
const STATUS_OPTIONS = ["Pending", "MOU Signed", "Partnership", "Rejected", "Unqualified"];

export default function AddPartnerForm({ secret }: { secret: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ slug: string; counselorId: string } | null>(null);

  // Required
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [poc, setPoc] = useState<string[]>([]);
  const [meetingNotes, setMeetingNotes] = useState("");

  // Optional
  const [phone, setPhone] = useState("");
  const [capacity, setCapacity] = useState("");
  const [scholarshipAmount, setScholarshipAmount] = useState("");
  const [referralAmount, setReferralAmount] = useState("");
  const [counselorId, setCounselorId] = useState("");
  const [followUpStatus, setFollowUpStatus] = useState("Pending");

  function togglePoc(name: string) {
    setPoc((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  }

  function resetForm() {
    setCompanyName("");
    setFirstName("");
    setEmail("");
    setCountry("");
    setPoc([]);
    setMeetingNotes("");
    setPhone("");
    setCapacity("");
    setScholarshipAmount("");
    setReferralAmount("");
    setCounselorId("");
    setFollowUpStatus("Pending");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !firstName.trim() || !email.trim() || !country.trim() || poc.length === 0 || !meetingNotes.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Step 1: Create counselor
      const counselorRes = await fetch("/api/counselors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          companyName: companyName.trim(),
          firstName: firstName.trim(),
          email: email.trim(),
          country: country.trim(),
          poc,
          phone: phone.trim() || undefined,
          capacity: capacity.trim() || undefined,
          scholarshipAmount: scholarshipAmount ? Number(scholarshipAmount) : undefined,
          referralAmount: referralAmount ? Number(referralAmount) : undefined,
          counselorId: counselorId.trim() || undefined,
          followUpStatus,
        }),
      });

      if (!counselorRes.ok) {
        const data = await counselorRes.json();
        throw new Error(data.error || "Failed to create partner");
      }

      const { recordId, counselorId: finalCounselorId } = await counselorRes.json();

      // Step 2: Create first conversation
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          counselorId: recordId,
          counselorName: companyName.trim(),
          date: new Date().toISOString().split("T")[0],
          notes: meetingNotes.trim(),
          attendee: poc[0],
        }),
      });

      if (!convRes.ok) {
        // Counselor was created but conversation failed — not critical
        console.error("Failed to create initial conversation");
      }

      // Generate the CEO slug
      const slug = companyName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      setSuccess({
        slug: `${slug}-${finalCounselorId.toLowerCase()}`,
        counselorId: finalCounselorId,
      });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="mt-6 text-center">
        <button
          onClick={() => { setIsOpen(true); setSuccess(null); }}
          className="px-4 py-2 bg-rise-green text-white text-sm font-medium rounded-lg hover:bg-rise-green/90 transition-colors"
        >
          + Add New Partner
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6 max-w-xl mx-auto">
        <div className="text-center">
          <p className="text-lg font-semibold text-rise-green font-heading">Partner Created!</p>
          <p className="text-sm text-rise-brown mt-2">
            Counselor ID: <span className="font-medium text-rise-black">{success.counselorId}</span>
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <a
              href={`/partner/${success.slug}`}
              className="px-4 py-2 bg-rise-green text-white text-sm font-medium rounded-lg hover:bg-rise-green/90 transition-colors"
            >
              View Partner Page
            </a>
            <button
              onClick={() => { setSuccess(null); setIsOpen(false); }}
              className="px-4 py-2 text-sm text-rise-brown hover:text-rise-black"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden max-w-2xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-rise-black font-heading">Add New Partner</h2>
        <button
          onClick={() => { setIsOpen(false); resetForm(); }}
          className="text-sm text-rise-brown hover:text-rise-black"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
        {/* Required fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-rise-black mb-1">
              Company Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
              placeholder="e.g. GradePerfect Education"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rise-black mb-1">
              First Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
              placeholder="Contact first name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rise-black mb-1">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
              placeholder="contact@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rise-black mb-1">
              Country <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
              placeholder="e.g. India"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-rise-black mb-1">
            POC (RISE) <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            {POC_OPTIONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => togglePoc(name)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  poc.includes(name)
                    ? "bg-rise-green text-white border-rise-green"
                    : "bg-white text-rise-brown border-gray-200 hover:border-rise-green"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-rise-black mb-1">
            First Meeting Notes <span className="text-red-400">*</span>
          </label>
          <textarea
            value={meetingNotes}
            onChange={(e) => setMeetingNotes(e.target.value)}
            placeholder="Notes from your first meeting..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none resize-y"
          />
        </div>

        {/* Optional fields */}
        <details className="group">
          <summary className="text-sm font-medium text-rise-brown cursor-pointer hover:text-rise-black">
            Optional fields
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-rise-black mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rise-black mb-1">Capacity</label>
              <input
                type="text"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
                placeholder="Expected number of students"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rise-black mb-1">Scholarship %</label>
              <input
                type="number"
                step="0.1"
                value={scholarshipAmount}
                onChange={(e) => setScholarshipAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rise-black mb-1">Referral %</label>
              <input
                type="number"
                step="0.1"
                value={referralAmount}
                onChange={(e) => setReferralAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rise-black mb-1">Counselor ID</label>
              <input
                type="text"
                value={counselorId}
                onChange={(e) => setCounselorId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
                placeholder="Auto-generated if blank"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rise-black mb-1">Status</label>
              <select
                value={followUpStatus}
                onChange={(e) => setFollowUpStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </details>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-rise-green text-white text-sm font-medium rounded-lg hover:bg-rise-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating..." : "Create Partner"}
          </button>
        </div>
      </form>
    </div>
  );
}
