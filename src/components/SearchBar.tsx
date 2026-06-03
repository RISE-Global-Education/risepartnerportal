"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";

interface CounselorOption {
  companyName: string;
  slug: string;
  counselorId: string;
  pocNames: string[];
  pocEmails: string[];
  pocPhones: string[];
  pocPhonesDigits: string[];
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s\-_]+/g, "");
}

function words(s: string): string[] {
  return s.toLowerCase().split(/[\s\-_,.()]+/).filter(Boolean);
}

function anyWordStartsWith(s: string, q: string): boolean {
  return words(s).some((w) => w.startsWith(q));
}

function searchCounselor(c: CounselorOption, qN: string, qLow: string, qDigits: string): boolean {
  // Company name: norm prefix or word prefix
  if (norm(c.companyName).startsWith(qN)) return true;
  if (anyWordStartsWith(c.companyName, qLow)) return true;

  // Contact name: norm prefix or word prefix
  for (const name of c.pocNames) {
    if (norm(name).startsWith(qN)) return true;
    if (anyWordStartsWith(name, qLow)) return true;
  }

  // Email: substring (only for queries 4+ chars to avoid noise)
  if (qLow.length >= 4) {
    for (const email of c.pocEmails) {
      if (email.toLowerCase().includes(qLow)) return true;
    }
  }

  // Phone: digit substring (only for 4+ digit queries)
  if (qDigits.length >= 4) {
    for (const p of c.pocPhonesDigits) {
      if (p.includes(qDigits)) return true;
    }
  }

  // Company name substring (only for 4+ char queries)
  if (qN.length >= 4 && norm(c.companyName).includes(qN)) return true;

  return false;
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

  // Fuse only as typo fallback when keyword search finds nothing
  const fuse = useMemo(
    () =>
      new Fuse(counselors, {
        keys: [
          { name: "companyName", weight: 3 },
          { name: "pocNames", weight: 2 },
          { name: "pocEmails", weight: 1.5 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 3,
        shouldSort: true,
      }),
    [counselors]
  );

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const qN = norm(trimmed);
    const qLow = trimmed.toLowerCase();
    const qDigits = trimmed.replace(/\D/g, "");

    // 1. Keyword + contact search — exact prefix/word/substring, no noise
    const keywordMatches = counselors.filter((c) =>
      searchCounselor(c, qN, qLow, qDigits)
    );

    // Keyword found results → return them directly (precise)
    if (keywordMatches.length > 0) return keywordMatches;

    // 2. Fuzzy fallback — only when keyword found nothing (handles typos)
    if (qN.length >= 3) {
      return fuse.search(trimmed).map((r) => r.item);
    }

    return [];
  }, [query, counselors, fuse]);

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

  const qLow = query.trim().toLowerCase();

  function isContactMatch(c: CounselorOption): string[] {
    if (!qLow) return [];
    const qN = norm(qLow);
    return c.pocNames.filter(
      (name) => norm(name).startsWith(qN) || anyWordStartsWith(name, qLow)
    );
  }

  return (
    <div className="relative w-full max-w-xl">
      <input
        ref={inputRef}
        type="text"
        placeholder="Search by company, name, email, or phone..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={handleKeyDown}
        className="w-full px-5 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-rise-green focus:outline-none bg-white text-rise-black placeholder:text-rise-brown/50 shadow-sm transition-colors"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-h-80 overflow-y-auto">
          {filtered.map((counselor, index) => {
            const companyMatch =
              norm(counselor.companyName).includes(norm(qLow)) ||
              anyWordStartsWith(counselor.companyName, qLow);
            const viaContacts = !companyMatch ? isContactMatch(counselor) : [];

            return (
              <button
                key={counselor.counselorId}
                onMouseDown={() => navigate(counselor)}
                className={`w-full px-5 py-3 text-left hover:bg-rise-cream transition-colors ${
                  index === selectedIndex ? "bg-rise-cream" : ""
                }`}
              >
                <p className="font-medium text-rise-black">
                  {counselor.companyName}
                </p>
                {viaContacts.length > 0 && (
                  <p className="text-xs text-rise-green mt-0.5">
                    via {viaContacts.join(", ")}
                  </p>
                )}
                <p className="text-xs text-rise-brown mt-0.5">
                  Contacts:{" "}
                  {counselor.pocNames.length > 0
                    ? counselor.pocNames.join(", ")
                    : "—"}
                </p>
                {counselor.pocEmails.length > 0 && (
                  <p className="text-xs text-rise-brown mt-0.5">
                    Email: {counselor.pocEmails.join(", ")}
                  </p>
                )}
                {counselor.pocPhones.length > 0 && (
                  <p className="text-xs text-rise-brown mt-0.5">
                    Phone: {counselor.pocPhones.join(", ")}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
      {isOpen && query.trim().length >= 2 && filtered.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 px-5 py-4 text-sm text-rise-brown">
          No partners found matching &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
