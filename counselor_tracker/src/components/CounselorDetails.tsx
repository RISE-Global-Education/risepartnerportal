"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Counselor } from "@/lib/types";

interface EditableFieldProps {
  label: string;
  value: string;
  fieldName: string;
  recordId: string;
  secret: string;
  isCeoView: boolean;
  type?: "text" | "number" | "select";
  options?: string[];
  suffix?: string;
  onSaved: () => void;
}

function EditableField({
  label,
  value,
  fieldName,
  recordId,
  secret,
  isCeoView,
  type = "text",
  options,
  suffix,
  onSaved,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      let fieldVal: unknown = editValue;
      if (type === "number") fieldVal = Number(editValue);
      if (fieldName === "Referral Amount") fieldVal = Number(editValue) / 100;

      const res = await fetch("/api/counselors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          recordId,
          fields: { [fieldName]: fieldVal },
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      setEditing(false);
      onSaved();
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div>
        <span className="text-xs text-rise-brown uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-2 mt-1">
          {type === "select" && options ? (
            <select
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
            >
              <option value="">—</option>
              {options.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              type={type === "number" ? "number" : "text"}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
              step={type === "number" ? "0.1" : undefined}
            />
          )}
          <button
            onClick={save}
            disabled={saving}
            className="px-2 py-1 text-xs bg-rise-green text-white rounded-md hover:bg-rise-green/90 disabled:opacity-50"
          >
            {saving ? "..." : "Save"}
          </button>
          <button
            onClick={() => { setEditing(false); setEditValue(value); }}
            className="px-2 py-1 text-xs text-rise-brown hover:text-rise-black"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="text-xs text-rise-brown uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-sm font-medium text-rise-black">
          {value ? `${value}${suffix || ""}` : "—"}
        </p>
        {isCeoView && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-rise-green hover:text-rise-green/80"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

function MouSection({
  mouUrl,
  recordId,
  secret,
  isCeoView,
  onSaved,
}: {
  mouUrl: string | null;
  recordId: string;
  secret: string;
  isCeoView: boolean;
  onSaved: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("secret", secret);
      formData.append("recordId", recordId);
      formData.append("file", file);

      const res = await fetch("/api/counselors/mou", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <span className="text-xs text-rise-brown uppercase tracking-wide">MOU Document</span>
      <div className="flex items-center gap-3 mt-1">
        {mouUrl ? (
          <a
            href={mouUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-rise-green hover:underline"
          >
            View / Download MOU
          </a>
        ) : (
          <p className="text-sm text-rise-brown">No MOU uploaded</p>
        )}
        {isCeoView && (
          <label className="text-xs text-rise-green hover:text-rise-green/80 cursor-pointer">
            {uploading ? "Uploading..." : mouUrl ? "Replace" : "Upload"}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}

// ─── MOU Generation ──────────────────────────────────────────────────────────

type MouType = "scholarship" | "referral-normal" | "referral-tier";
type TierRow = { amount: string; studentNumber: string };

function MouPreviewModal({
  counselor,
  secret,
  mouType,
  onClose,
}: {
  counselor: Counselor;
  secret: string;
  mouType: MouType;
  onClose: () => void;
}) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const [partnerName, setPartnerName] = useState(counselor.companyName);
  const [date, setDate] = useState(today);
  const [signatory, setSignatory] = useState(counselor.firstName);
  const [scholarshipAmount, setScholarshipAmount] = useState(
    counselor.scholarshipAmount != null ? String(counselor.scholarshipAmount) : ""
  );
  const [referralAmount, setReferralAmount] = useState(
    counselor.referralAmount != null ? String(Math.round(counselor.referralAmount * 100)) : ""
  );
  const [tiers, setTiers] = useState<TierRow[]>([{ amount: "", studentNumber: "" }]);
  const [generating, setGenerating] = useState(false);

  function addTier() {
    setTiers((prev) => [...prev, { amount: "", studentNumber: "" }]);
  }

  function removeTier(idx: number) {
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTier(idx: number, field: keyof TierRow, value: string) {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/counselors/mou/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          type: mouType,
          partnerName,
          date,
          signatory,
          ...(mouType === "scholarship" && { scholarshipAmount }),
          ...(mouType === "referral-normal" && { referralAmount }),
          ...(mouType === "referral-tier" && { tiers }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate MOU");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const namePart: Record<MouType, string> = {
        scholarship: "Scholarship-MOU",
        "referral-normal": "Referral-MOU",
        "referral-tier": "Referral-Tier-MOU",
      };
      a.href = url;
      a.download = `${partnerName.replace(/\s+/g, "-")}-${namePart[mouType]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate MOU");
    } finally {
      setGenerating(false);
    }
  }

  const titleMap: Record<MouType, string> = {
    scholarship: "Scholarship MOU",
    "referral-normal": "Referral MOU",
    "referral-tier": "Referral Tier MOU",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-rise-black">{titleMap[mouType]} — Preview</h2>
          <button onClick={onClose} className="text-rise-brown hover:text-rise-black text-lg leading-none">×</button>
        </div>

        <div className="space-y-4">
          <Field label="Partner Name" value={partnerName} onChange={setPartnerName} />
          <Field label="Date" value={date} onChange={setDate} />

          {mouType === "scholarship" && (
            <Field
              label="Scholarship Amount (%)"
              value={scholarshipAmount}
              onChange={setScholarshipAmount}
              type="number"
            />
          )}

          {mouType === "referral-normal" && (
            <Field
              label="Referral Amount (%)"
              value={referralAmount}
              onChange={setReferralAmount}
              type="number"
            />
          )}

          {mouType === "referral-tier" && (
            <div>
              <span className="text-xs text-rise-brown uppercase tracking-wide">Tier Rows</span>
              <div className="mt-2 space-y-2">
                {tiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-rise-brown w-12">Tier {idx + 1}</span>
                    <input
                      type="text"
                      placeholder="Amount (e.g. 10%)"
                      value={tier.amount}
                      onChange={(e) => updateTier(idx, "amount", e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="# students"
                      value={tier.studentNumber}
                      onChange={(e) => updateTier(idx, "studentNumber", e.target.value)}
                      className="w-24 px-2 py-1 text-xs border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
                    />
                    {tiers.length > 1 && (
                      <button
                        onClick={() => removeTier(idx)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addTier}
                  className="text-xs text-rise-green hover:text-rise-green/80 mt-1"
                >
                  + Add Tier
                </button>
              </div>
            </div>
          )}

          <Field label="Signatory Name" value={signatory} onChange={setSignatory} />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-rise-brown border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={generate}
            disabled={generating}
            className="flex-1 px-4 py-2 text-sm bg-rise-green text-white rounded-lg hover:bg-rise-green/90 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <div>
      <label className="text-xs text-rise-brown uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
      />
    </div>
  );
}

function ReferralMouPicker({
  counselor,
  secret,
  onClose,
}: {
  counselor: Counselor;
  secret: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<"referral-normal" | "referral-tier" | null>(null);

  if (selected) {
    return (
      <MouPreviewModal
        counselor={counselor}
        secret={secret}
        mouType={selected}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-rise-black">Create Referral MOU</h2>
          <button onClick={onClose} className="text-rise-brown hover:text-rise-black text-lg leading-none">×</button>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setSelected("referral-normal")}
            className="w-full px-4 py-3 text-sm font-medium border border-gray-200 rounded-xl hover:border-rise-green hover:text-rise-green transition-colors text-left"
          >
            Normal Referral MOU
            <p className="text-xs text-rise-brown font-normal mt-0.5">Fixed referral percentage</p>
          </button>
          <button
            onClick={() => setSelected("referral-tier")}
            className="w-full px-4 py-3 text-sm font-medium border border-gray-200 rounded-xl hover:border-rise-green hover:text-rise-green transition-colors text-left"
          >
            Tier Referral MOU
            <p className="text-xs text-rise-brown font-normal mt-0.5">Multiple tiers with different rates</p>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CounselorDetails({
  counselor,
  isCeoView,
  secret,
}: {
  counselor: Counselor;
  isCeoView: boolean;
  secret: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mouModal, setMouModal] = useState<"scholarship" | "referral" | null>(null);

  function onSaved() {
    router.refresh();
  }

  // Partners only see MOU download (if exists) — no collapsible section
  if (!isCeoView) {
    if (!counselor.mouUrl) return null;
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <MouSection
          mouUrl={counselor.mouUrl}
          recordId={counselor.id}
          secret={secret}
          isCeoView={false}
          onSaved={onSaved}
        />
      </div>
    );
  }

  return (
    <>
      {mouModal === "scholarship" && (
        <MouPreviewModal
          counselor={counselor}
          secret={secret}
          mouType="scholarship"
          onClose={() => setMouModal(null)}
        />
      )}
      {mouModal === "referral" && (
        <ReferralMouPicker
          counselor={counselor}
          secret={secret}
          onClose={() => setMouModal(null)}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium text-rise-black hover:bg-gray-50 transition-colors"
        >
          <span>{isOpen ? "Hide Details" : "Show Details"}</span>
          <span className="text-rise-brown">{isOpen ? "▲" : "▼"}</span>
        </button>
        {isOpen && (
          <div className="px-6 pb-5 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <EditableField
                label="First Name"
                value={counselor.firstName}
                fieldName="First Name"
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                onSaved={onSaved}
              />
              <EditableField
                label="Email"
                value={counselor.email}
                fieldName="Email ID (s)"
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                onSaved={onSaved}
              />
              <EditableField
                label="Phone"
                value={counselor.phone}
                fieldName="Phone Number"
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                onSaved={onSaved}
              />
              <EditableField
                label="Country"
                value={counselor.country}
                fieldName="Country"
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                onSaved={onSaved}
              />
              <EditableField
                label="Counselor ID"
                value={counselor.counselorId}
                fieldName="Counselor ID"
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                onSaved={onSaved}
              />
              <EditableField
                label="Scholarship Amount"
                value={counselor.scholarshipAmount != null ? String(counselor.scholarshipAmount) : ""}
                fieldName="Scholarship Amount"
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                type="number"
                suffix="%"
                onSaved={onSaved}
              />
              <EditableField
                label="Referral Amount"
                value={counselor.referralAmount != null ? String(counselor.referralAmount * 100) : ""}
                fieldName="Referral Amount"
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                type="number"
                suffix="%"
                onSaved={onSaved}
              />
              <EditableField
                label="Capacity"
                value={counselor.capacity}
                fieldName="Expected Number"
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                onSaved={onSaved}
              />
              <EditableField
                label="Partnership Status"
                value={counselor.followUpStatus}
                fieldName="Follow Up Status"
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                type="select"
                options={["Partnership", "MOU Signed", "Pending", "Rejected", "Unqualified"]}
                onSaved={onSaved}
              />
              <EditableField
                label="Student Interview Required"
                value={counselor.studentInterview}
                fieldName="Student Interview"
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                type="select"
                options={["Yes", "No"]}
                onSaved={onSaved}
              />
              <MouSection
                mouUrl={counselor.mouUrl}
                recordId={counselor.id}
                secret={secret}
                isCeoView={isCeoView}
                onSaved={onSaved}
              />
            </div>

            {/* MOU Generation Buttons */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              <button
                onClick={() => setMouModal("scholarship")}
                className="px-4 py-2 text-xs font-medium bg-rise-green/10 text-rise-green rounded-lg hover:bg-rise-green/20 transition-colors"
              >
                Create Scholarship MOU
              </button>
              <button
                onClick={() => setMouModal("referral")}
                className="px-4 py-2 text-xs font-medium bg-rise-green/10 text-rise-green rounded-lg hover:bg-rise-green/20 transition-colors"
              >
                Create Referral MOU
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
