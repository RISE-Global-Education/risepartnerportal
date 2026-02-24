"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CounselorOption {
  companyName: string;
  slug: string;
  counselorId: string;
  poc: string[];
  followUpStatus: string;
}

export default function SearchBar({
  counselors,
}: {
  counselors: CounselorOption[];
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query.length > 0
    ? counselors.filter((c) =>
        c.companyName.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function navigate(counselor: CounselorOption) {
    const ceoSlug = `${counselor.slug}-${counselor.counselorId.toLowerCase()}`;
    router.push(`/partner/${ceoSlug}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      navigate(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative w-full max-w-xl">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search for a partner..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Delay closing so click events on dropdown can fire
          setTimeout(() => setIsOpen(false), 200);
        }}
        onKeyDown={handleKeyDown}
        className="w-full px-5 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-rise-green focus:outline-none bg-white text-rise-black placeholder:text-rise-brown/50 shadow-sm transition-colors"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-h-80 overflow-y-auto">
          {filtered.map((counselor, index) => (
            <button
              key={counselor.counselorId}
              onMouseDown={() => navigate(counselor)}
              className={`w-full px-5 py-3 text-left hover:bg-rise-cream transition-colors flex items-center justify-between ${
                index === selectedIndex ? "bg-rise-cream" : ""
              }`}
            >
              <div>
                <p className="font-medium text-rise-black">
                  {counselor.companyName}
                </p>
                <p className="text-xs text-rise-brown mt-0.5">
                  POC: {counselor.poc.length > 0 ? counselor.poc.join(", ") : "—"}
                </p>
              </div>
              {counselor.followUpStatus && (
                <span className="text-xs px-2 py-1 rounded-full bg-rise-cream text-rise-brown">
                  {counselor.followUpStatus}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {isOpen && query.length > 0 && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 px-5 py-4 text-sm text-rise-brown">
          No partners found matching &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
