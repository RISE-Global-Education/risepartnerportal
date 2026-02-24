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
        </div>
      )}
    </div>
  );
}
