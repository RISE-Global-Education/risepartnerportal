"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-rise-brown hover:text-rise-black hover:bg-gray-100 rounded-lg transition-colors shrink-0"
    >
      ← Back
    </button>
  );
}
