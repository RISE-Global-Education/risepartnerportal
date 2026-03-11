"use client";

import { useState } from "react";

const STATUS_OPTIONS = ["Pending", "MOU Signed", "Partnership", "Rejected", "Unqualified"];
const RISE_POC_OPTIONS = ["Yash", "Shreyans", "Prachi"];

interface PocEntry {
  name: string;
  email: string;
  position: string;
  eFname: string;
  outreachOptIn: boolean;
}

function emptyPoc(): PocEntry {
  return { name: "", email: "", position: "", eFname: "", outreachOptIn: true };
}

export default function AddPartnerForm({ secret }: { secret: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ slug: string; counselorId: string } | null>(null);

  // Required
  const [companyName, setCompanyName] = useState("");
  const [country, setCountry] = useState("");
  const [risePoc, setRisePoc] = useState<string[]>([]);
  const [pocs, setPocs] = useState<PocEntry[]>([emptyPoc()]);
  const [meetingNotes, setMeetingNotes] = useState("");

  // Optional
  const [phone, setPhone] = useState("");
  const [capacity, setCapacity] = useState("");
  const [scholarshipAmount, setScholarshipAmount] = useState("");
  const [referralAmount, setReferralAmount] = useState("");
  const [followUpStatus, setFollowUpStatus] = useState("Pending");

  // Outreach Details
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [studentInterview, setStudentInterview] = useState("Yes");
  const [shareBrochure, setShareBrochure] = useState("Yes");
  const [sharePayment, setSharePayment] = useState("Yes");
  const [studentMixMaxAddin, setStudentMixMaxAddin] = useState("Yes");

  function updatePoc(index: number, field: keyof PocEntry, value: string | boolean) {
    setPocs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function addPoc() {
    setPocs((prev) => [...prev, emptyPoc()]);
  }

  function removePoc(index: number) {
    if (pocs.length === 1) return;
    setPocs((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleRisePoc(name: string) {
    setRisePoc((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  }

  function resetForm() {
    setCompanyName("");
    setCountry("");
    setRisePoc([]);
    setPocs([emptyPoc()]);
    setMeetingNotes("");
    setPhone("");
    setCapacity("");
    setScholarshipAmount("");
    setReferralAmount("");
    setFollowUpStatus("Pending");
    setStudentInterview("Yes");
    setShareBrochure("Yes");
    setSharePayment("Yes");
    setStudentMixMaxAddin("Yes");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const primaryPoc = pocs[0];
    if (!companyName.trim() || !country.trim() || risePoc.length === 0 || !primaryPoc.name.trim() || !meetingNotes.trim()) {
      setError("Please fill in all required fields (Company Name, Country, POC (RISE), Contact Name, Meeting Notes)");
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
          firstName: primaryPoc.name.trim(),
          email: primaryPoc.email.trim() || undefined,
          country: country.trim(),
          poc: risePoc,
          phone: phone.trim() || undefined,
          capacity: capacity.trim() || undefined,
          scholarshipAmount: scholarshipAmount ? Number(scholarshipAmount) : undefined,
          referralAmount: referralAmount ? Number(referralAmount) : undefined,
          followUpStatus,
          studentInterview,
          shareBrochure,
          sharePayment,
          studentMixMaxAddin,
        }),
      });

      if (!counselorRes.ok) {
        const data = await counselorRes.json();
        throw new Error(data.error || "Failed to create partner");
      }

      const { recordId, counselorId: finalCounselorId } = await counselorRes.json();

      // Step 2: Create contacts (one per POC)
      const contacts = pocs
        .filter((p) => p.name.trim())
        .map((p, i) => ({
          name: p.name.trim(),
          email: p.email.trim() || undefined,
          position: p.position.trim() || undefined,
          eFname: p.eFname.trim() || undefined,
          outreachOptIn: p.outreachOptIn,
          companyName: companyName.trim(),
          counselorId: finalCounselorId,
          index: i + 1,
        }));

      const contactsRes = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, contacts }),
      });

      // Step 2b: Link contacts to counselor's POC field
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        const contactRecordIds = (contactsData.records as { id: string }[]).map((r) => r.id);
        if (contactRecordIds.length > 0) {
          await fetch("/api/counselors", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              secret,
              recordId,
              fields: { POC: contactRecordIds },
            }),
          });
        }
      }

      // Step 3: Create first conversation
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          counselorId: recordId,
          counselorName: companyName.trim(),
          date: new Date().toISOString().split("T")[0],
          notes: meetingNotes.trim(),
          attendee: risePoc[0],
        }),
      });

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
    <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden max-w-4xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-rise-black font-heading">Add New Partner</h2>
        <button
          onClick={() => { setIsOpen(false); resetForm(); }}
          className="text-sm text-rise-brown hover:text-rise-black"
        >
          Cancel
        </button>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">

        {/* Company Name + Country */}
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

        {/* RISE POC */}
        <div>
          <label className="block text-sm font-medium text-rise-black mb-2">
            POC (RISE) <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            {RISE_POC_OPTIONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => toggleRisePoc(name)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  risePoc.includes(name)
                    ? "bg-rise-green text-white border-rise-green"
                    : "bg-white text-rise-brown border-gray-200 hover:border-rise-green"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Partner Contacts Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-rise-black">
              Primary POC <span className="text-red-400">*</span>
            </label>
            <button
              type="button"
              onClick={addPoc}
              className="text-xs text-rise-green hover:underline font-medium"
            >
              + Add another POC
            </button>
          </div>

          <div className="space-y-3">
            {pocs.map((poc, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rise-brown uppercase tracking-wide">
                    {i === 0 ? "POC 1 (Primary)" : `POC ${i + 1}`}
                  </span>
                  {pocs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePoc(i)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-rise-black mb-1">
                      Name {i === 0 && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="text"
                      value={poc.name}
                      onChange={(e) => updatePoc(i, "name", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-rise-black mb-1">Email</label>
                    <input
                      type="email"
                      value={poc.email}
                      onChange={(e) => updatePoc(i, "email", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-rise-black mb-1">Position</label>
                    <input
                      type="text"
                      value={poc.position}
                      onChange={(e) => updatePoc(i, "position", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
                      placeholder="e.g. Director"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-rise-black mb-1">Name to use in email</label>
                    <input
                      type="text"
                      value={poc.eFname}
                      onChange={(e) => updatePoc(i, "eFname", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-rise-green focus:outline-none"
                      placeholder="First name for emails"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-rise-black">Outreach Opt-in</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updatePoc(i, "outreachOptIn", true)}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        poc.outreachOptIn
                          ? "bg-rise-green text-white border-rise-green"
                          : "bg-white text-rise-brown border-gray-200 hover:border-rise-green"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePoc(i, "outreachOptIn", false)}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        !poc.outreachOptIn
                          ? "bg-red-500 text-white border-red-500"
                          : "bg-white text-rise-brown border-gray-200 hover:border-red-300"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* First Meeting Notes */}
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

        {/* Outreach Details */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOutreachOpen((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-rise-black hover:bg-gray-50 transition-colors"
          >
            <span>Outreach Details</span>
            <span className="text-rise-brown text-xs">{outreachOpen ? "▲" : "▼"}</span>
          </button>
          {outreachOpen && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(
                [
                  { label: "Student Interview", value: studentInterview, setter: setStudentInterview },
                  { label: "Share Brochure", value: shareBrochure, setter: setShareBrochure },
                  { label: "Share Payment", value: sharePayment, setter: setSharePayment },
                  { label: "Student MixMax Addin", value: studentMixMaxAddin, setter: setStudentMixMaxAddin },
                ] as { label: string; value: string; setter: (v: string) => void }[]
              ).map(({ label, value, setter }) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-rise-black mb-1">{label}</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setter("Yes")}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        value === "Yes"
                          ? "bg-rise-green text-white border-rise-green"
                          : "bg-white text-rise-brown border-gray-200 hover:border-rise-green"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setter("No")}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        value === "No"
                          ? "bg-red-500 text-white border-red-500"
                          : "bg-white text-rise-brown border-gray-200 hover:border-red-300"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
