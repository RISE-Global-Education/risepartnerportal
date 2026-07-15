"use client";

import { useState } from "react";
import type { FunnelStage } from "@/lib/types";
import StudentProgressModal from "./StudentProgressModal";

export default function StudentProgressButton({
  studentId,
  studentName,
  stage,
  partnerSlug,
}: {
  studentId: string;
  studentName: string;
  stage: FunnelStage;
  partnerSlug: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-block px-3 py-1.5 bg-rise-green text-white text-xs font-medium rounded-lg hover:bg-rise-green/90 transition-colors"
      >
        View student progress
      </button>
      {open && (
        <StudentProgressModal
          studentId={studentId}
          studentName={studentName}
          stage={stage}
          partnerSlug={partnerSlug}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
