"use client";

import { useState } from "react";
import type { Counselor, Contact } from "@/lib/types";

// ─── Editable Field (counselor) ───────────────────────────────────────────────

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

// ─── Contacts Panel (batch edit + add) ───────────────────────────────────────

interface ContactDraft {
  id: string | null; // null = new, not yet saved
  name: string;
  email: string;
  phone: string;
  position: string;
  eFname: string;
  outreachOptIn: boolean;
  leadId: string; // read-only display
}

function ContactsPanel({
  contacts,
  counselor,
  secret,
  isCeoView,
  onSaved,
}: {
  contacts: Contact[];
  counselor: Counselor;
  secret: string;
  isCeoView: boolean;
  onSaved: () => void;
}) {
  const [drafts, setDrafts] = useState<ContactDraft[]>(() =>
    contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      position: c.position,
      eFname: c.eFname,
      outreachOptIn: c.outreachOptIn,
      leadId: c.leadId,
    }))
  );
  // track which cards are in edit mode (by index)
  const [editingCards, setEditingCards] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  function setCardEditing(i: number, on: boolean) {
    setEditingCards((prev) => {
      const next = new Set(prev);
      on ? next.add(i) : next.delete(i);
      return next;
    });
  }

  const isDirty =
    drafts.length !== contacts.length ||
    drafts.some((d, i) => {
      if (d.id === null) return true;
      const orig = contacts[i];
      return (
        d.name !== orig.name ||
        d.email !== orig.email ||
        d.phone !== orig.phone ||
        d.position !== orig.position ||
        d.eFname !== orig.eFname ||
        d.outreachOptIn !== orig.outreachOptIn
      );
    });

  function update(index: number, field: keyof ContactDraft, value: string | boolean) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  }

  function addNew() {
    const nextIndex = drafts.length + 1;
    setDrafts((prev) => [
      ...prev,
      {
        id: null,
        name: "",
        email: "",
        phone: "",
        position: "",
        eFname: "",
        outreachOptIn: true,
        leadId: `${counselor.companyName} — ${counselor.counselorId} — ${nextIndex}`,
      },
    ]);
    setEditingCards((prev) => new Set(prev).add(drafts.length));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      // Patch existing contacts
      const existing = drafts.filter((d) => d.id !== null);
      for (const draft of existing) {
        const orig = contacts.find((c) => c.id === draft.id);
        if (!orig) continue;
        const changed =
          draft.name !== orig.name ||
          draft.email !== orig.email ||
          draft.phone !== orig.phone ||
          draft.position !== orig.position ||
          draft.eFname !== orig.eFname ||
          draft.outreachOptIn !== orig.outreachOptIn;
        if (!changed) continue;

        const res = await fetch("/api/contacts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret,
            recordId: draft.id,
            fields: {
              Name: draft.name,
              Email: draft.email,
              "Phone Number": draft.phone,
              Position: draft.position,
              E_FNAME: draft.eFname,
              "Email Opt-in": draft.outreachOptIn ? "Yes" : "No",
            },
          }),
        });
        if (!res.ok) throw new Error("Failed to update contact");
      }

      // Create new contacts
      const newDrafts = drafts.filter((d) => d.id === null && d.name.trim());
      if (newDrafts.length > 0) {
        const contactsPayload = newDrafts.map((d, i) => ({
          name: d.name.trim(),
          email: d.email.trim() || undefined,
          phone: d.phone.trim() || undefined,
          position: d.position.trim() || undefined,
          eFname: d.eFname.trim() || undefined,
          outreachOptIn: d.outreachOptIn,
          companyName: counselor.companyName,
          counselorId: counselor.counselorId,
          index: contacts.length + i + 1,
        }));

        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret, contacts: contactsPayload }),
        });
        if (!res.ok) throw new Error("Failed to create contact");

        // Link new contacts to counselor's POC field
        const data = await res.json();
        const newIds = (data.records as { id: string }[]).map((r) => r.id);
        const allIds = [...counselor.pocRecordIds, ...newIds];
        await fetch("/api/counselors", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret,
            recordId: counselor.id,
            fields: { POC: allIds },
          }),
        });
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function deletePoc(index: number) {
    const draft = drafts[index];
    if (!draft.id) return;
    setDeleting(true);
    try {
      const remainingPocIds = drafts
        .filter((_, j) => j !== index)
        .map((d) => d.id)
        .filter((id): id is string => id !== null);

      const res = await fetch("/api/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          recordId: draft.id,
          counselorRecordId: counselor.id,
          remainingPocIds,
        }),
      });
      if (!res.ok) throw new Error("Failed to delete contact");
      onSaved();
    } catch {
      alert("Failed to delete contact. Please try again.");
    } finally {
      setDeleting(false);
      setConfirmDeleteIndex(null);
    }
  }

  return (
    <div>
      {confirmDeleteIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-rise-black mb-2">Delete POC?</h2>
            <p className="text-sm text-rise-brown mb-6">
              Are you sure you want to delete{" "}
              <span className="font-medium text-rise-black">
                {drafts[confirmDeleteIndex]?.name || "this contact"}
              </span>
              ? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteIndex(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm text-rise-brown border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePoc(confirmDeleteIndex)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wider">Contacts</h3>
        {isCeoView && (
          <button
            type="button"
            onClick={addNew}
            className="text-xs text-rise-green hover:underline font-medium"
          >
            + Add POC
          </button>
        )}
      </div>

      <div className="space-y-4">
        {drafts.map((draft, i) => {
          const isEditing = editingCards.has(i);
          return (
            <div key={i} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-rise-brown uppercase tracking-wide">
                  POC {i + 1}
                </p>
                <div className="flex items-center gap-3">
                  {isCeoView && !isEditing && draft.id !== null && (
                    <button
                      type="button"
                      onClick={() => setCardEditing(i, true)}
                      className="text-xs text-rise-green hover:text-rise-green/80"
                    >
                      Edit
                    </button>
                  )}
                  {isCeoView && isEditing && draft.id !== null && (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteIndex(i)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardEditing(i, false)}
                        className="text-xs text-rise-brown hover:text-rise-black"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {isCeoView && draft.id === null && (
                    <button
                      type="button"
                      onClick={() => {
                        setDrafts((prev) => prev.filter((_, j) => j !== i));
                        setEditingCards((prev) => {
                          const next = new Set<number>();
                          prev.forEach((idx) => { if (idx < i) next.add(idx); else if (idx > i) next.add(idx - 1); });
                          return next;
                        });
                      }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      ✕ Remove
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-rise-brown uppercase tracking-wide">POC ID</span>
                  <p className="text-sm font-medium text-rise-black mt-1">{draft.leadId || "—"}</p>
                </div>
                {isEditing ? (
                  <>
                    <div>
                      <label className="text-xs text-rise-brown uppercase tracking-wide">Name</label>
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => update(i, "name", e.target.value)}
                        className="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-rise-brown uppercase tracking-wide">Email</label>
                      <input
                        type="text"
                        value={draft.email}
                        onChange={(e) => update(i, "email", e.target.value)}
                        className="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-rise-brown uppercase tracking-wide">Phone Number</label>
                      <input
                        type="text"
                        value={draft.phone}
                        onChange={(e) => update(i, "phone", e.target.value)}
                        className="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-rise-brown uppercase tracking-wide">Position</label>
                      <input
                        type="text"
                        value={draft.position}
                        onChange={(e) => update(i, "position", e.target.value)}
                        className="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-rise-brown uppercase tracking-wide">Name to use in email</label>
                      <input
                        type="text"
                        value={draft.eFname}
                        onChange={(e) => update(i, "eFname", e.target.value)}
                        className="mt-1 w-full px-2 py-1 text-sm border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-xs text-rise-brown uppercase tracking-wide">Outreach Opt-in</span>
                      <div className="flex gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => update(i, "outreachOptIn", true)}
                          className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                            draft.outreachOptIn
                              ? "bg-rise-green text-white border-rise-green"
                              : "bg-white text-rise-brown border-gray-200 hover:border-rise-green"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => update(i, "outreachOptIn", false)}
                          className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                            !draft.outreachOptIn
                              ? "bg-red-500 text-white border-red-500"
                              : "bg-white text-rise-brown border-gray-200 hover:border-red-300"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-xs text-rise-brown uppercase tracking-wide">Name</span>
                      <p className="text-sm font-medium text-rise-black mt-1">{draft.name || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-rise-brown uppercase tracking-wide">Email</span>
                      <p className="text-sm font-medium text-rise-black mt-1">{draft.email || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-rise-brown uppercase tracking-wide">Phone Number</span>
                      <p className="text-sm font-medium text-rise-black mt-1">{draft.phone || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-rise-brown uppercase tracking-wide">Position</span>
                      <p className="text-sm font-medium text-rise-black mt-1">{draft.position || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-rise-brown uppercase tracking-wide">Name to use in email</span>
                      <p className="text-sm font-medium text-rise-black mt-1">{draft.eFname || "—"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-rise-brown uppercase tracking-wide">Outreach Opt-in</span>
                      <p className={`text-sm font-medium mt-1 ${draft.outreachOptIn ? "text-rise-green" : "text-red-500"}`}>
                        {draft.outreachOptIn ? "Yes" : "No"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isCeoView && isDirty && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-xs bg-rise-green text-white font-medium rounded-lg hover:bg-rise-green/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ─── MOU Section ──────────────────────────────────────────────────────────────

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
  const todayIso = new Date().toISOString().split("T")[0]; // YYYY-MM-DD for input

  const [partnerName, setPartnerName] = useState(counselor.companyName);
  const [date, setDate] = useState(todayIso);
  const [signatory, setSignatory] = useState(counselor.firstName);
  const [scholarshipAmount, setScholarshipAmount] = useState(
    counselor.scholarshipAmount != null ? String(counselor.scholarshipAmount) : ""
  );
  const [referralAmount, setReferralAmount] = useState(
    counselor.referralAmount != null ? String(Math.round(counselor.referralAmount * 100)) : ""
  );
  const [signDesignation, setSignDesignation] = useState("");
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
          date: date ? date.split("-").reverse().join("/") : "",
          signatory,
          ...(mouType === "scholarship" && { scholarshipAmount }),
          ...(mouType === "referral-normal" && { referralAmount, signDesignation }),
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
          {/* Read-only: Partner Name */}
          <div>
            <label className="text-xs text-rise-brown uppercase tracking-wide">Partner Name</label>
            <p className="mt-1 px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-rise-black">{partnerName}</p>
          </div>

          {/* Read-only: Amount (scholarship / referral-normal only) */}
          {mouType === "scholarship" && (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-xs text-rise-brown uppercase tracking-wide">Scholarship Amount</label>
                <span className="text-xs text-rise-brown italic">To change, edit on the details page</span>
              </div>
              <p className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-rise-black">
                {scholarshipAmount ? `${scholarshipAmount}%` : "—"}
              </p>
            </div>
          )}
          {mouType === "referral-normal" && (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <label className="text-xs text-rise-brown uppercase tracking-wide">Referral Amount</label>
                <span className="text-xs text-rise-brown italic">To change, edit on the details page</span>
              </div>
              <p className="px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-rise-black">
                {referralAmount ? `${referralAmount}%` : "—"}
              </p>
            </div>
          )}

          {/* Tier rows (referral-tier only) */}
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
                      <button onClick={() => removeTier(idx)} className="text-xs text-red-400 hover:text-red-600">×</button>
                    )}
                  </div>
                ))}
                <button onClick={addTier} className="text-xs text-rise-green hover:text-rise-green/80 mt-1">
                  + Add Tier
                </button>
              </div>
            </div>
          )}

          {/* Editable: Date & Signatory */}
          <div>
            <label className="text-xs text-rise-brown uppercase tracking-wide">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:border-rise-green focus:outline-none"
            />
          </div>
          <ModalField label="Signatory Name" value={signatory} onChange={setSignatory} />
          {mouType === "referral-normal" && (
            <ModalField label="Signatory Designation" value={signDesignation} onChange={setSignDesignation} />
          )}
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

function ModalField({
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
    return <MouPreviewModal counselor={counselor} secret={secret} mouType={selected} onClose={onClose} />;
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
  contacts,
  isCeoView,
  secret,
}: {
  counselor: Counselor;
  contacts: Contact[];
  isCeoView: boolean;
  secret: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mouModal, setMouModal] = useState<"scholarship" | "referral" | null>(null);
  const [outreachOpen, setOutreachOpen] = useState(false);

  function onSaved() {
    window.location.reload();
  }

  // Partners only see MOU download (if exists)
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
          <div className="px-6 pb-5 border-t border-gray-100 pt-4 space-y-6">

            {/* Basic Details */}
            <div>
              <h3 className="text-xs font-semibold text-rise-brown uppercase tracking-wider mb-3">Basic Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-rise-brown uppercase tracking-wide">Partner Type</span>
                  <p className="text-sm font-medium text-rise-black mt-1">{counselor.partnerType || "—"}</p>
                </div>
                {counselor.partnerType === "School" && (
                  <div>
                    <span className="text-xs text-rise-brown uppercase tracking-wide">Workshop Type</span>
                    <p className="text-sm font-medium text-rise-black mt-1">{counselor.workshopType || "—"}</p>
                  </div>
                )}
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
                <MouSection
                  mouUrl={counselor.mouUrl}
                  recordId={counselor.id}
                  secret={secret}
                  isCeoView={isCeoView}
                  onSaved={onSaved}
                />
              </div>
            </div>

            {/* POC Contacts */}
            <ContactsPanel
              contacts={contacts}
              counselor={counselor}
              secret={secret}
              isCeoView={isCeoView}
              onSaved={onSaved}
            />

            {/* MOU Generation Buttons */}
            <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2">
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

            {/* Student Outreach Details */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOutreachOpen((v) => !v)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-rise-black hover:bg-gray-50 transition-colors"
              >
                <span>Student Outreach Details</span>
                <span className="text-rise-brown text-xs">{outreachOpen ? "▲" : "▼"}</span>
              </button>
              {outreachOpen && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(
                    [
                      { label: "Student Interview", value: counselor.studentInterview, fieldName: "Student Interview" },
                      { label: "Share Brochure", value: counselor.shareBrochure, fieldName: "Share Brochure" },
                      { label: "Share Payment", value: counselor.sharePayment, fieldName: "Share Payment" },
                      { label: "Student MixMax Addin", value: counselor.studentMixMaxAddin, fieldName: "Student MixMax Addin" },
                    ] as { label: string; value: string; fieldName: string }[]
                  ).map(({ label, value, fieldName }) => (
                    <EditableField
                      key={fieldName}
                      label={label}
                      value={value}
                      fieldName={fieldName}
                      recordId={counselor.id}
                      secret={secret}
                      isCeoView={isCeoView}
                      type="select"
                      options={["Yes", "No"]}
                      onSaved={onSaved}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
