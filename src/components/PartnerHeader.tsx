"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Counselor } from "@/lib/types";

const POC_OPTIONS = ["Shreyans", "Yash", "Prachi", "Arth", "Muskaan"];

export default function PartnerHeader({
  counselor,
  isCeoView,
  secret,
}: {
  counselor: Counselor;
  isCeoView: boolean;
  secret?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(counselor.risePoc);
  const [saving, setSaving] = useState(false);

  function toggle(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/counselors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          recordId: counselor.id,
          fields: { "POC (RISE)": selected },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditing(false);
      router.refresh();
    } catch {
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setSelected(counselor.risePoc);
    setEditing(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
      <div className={`flex items-center gap-6 ${isCeoView ? "mb-6" : ""}`}>
        <Image
          src="/rise-logo.png"
          alt="RISE Logo"
          width={60}
          height={60}
          className="object-contain"
        />
        <div>
          <h1 className="text-3xl font-bold text-rise-black font-heading">
            {counselor.companyName}
          </h1>
          <p className="text-rise-brown mt-1">Partner Portal</p>
        </div>
      </div>
      {isCeoView && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-rise-brown">RISE Point of Contact</span>
            {editing ? (
              <div className="mt-1">
                <div className="flex flex-wrap gap-2">
                  {POC_OPTIONS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggle(name)}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        selected.includes(name)
                          ? "bg-rise-green text-white border-rise-green"
                          : "bg-white text-rise-brown border-gray-200 hover:border-rise-green"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="px-3 py-1 text-xs bg-rise-green text-white rounded-lg hover:bg-rise-green/90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancel}
                    className="px-3 py-1 text-xs text-rise-brown hover:text-rise-black"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="font-medium text-rise-black">
                  {counselor.risePoc.length > 0 ? counselor.risePoc.join(", ") : "—"}
                </p>
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-rise-green hover:text-rise-green/80"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
          <div>
            <span className="text-rise-brown">Capacity</span>
            <p className="font-medium text-rise-black mt-1">
              {counselor.capacity || "—"}
            </p>
          </div>
          <div>
            <span className="text-rise-brown">Partnership Status</span>
            <p className="font-medium text-rise-black mt-1">
              {counselor.followUpStatus || "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
