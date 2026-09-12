"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// null = no filter applied (every value passes). An explicit Set — even an
// empty one — means the user has interacted with this column's filter, so
// only values in the set (possibly none) should pass.
export type ColumnFilterValue = Set<string> | null;

const PANEL_WIDTH = 224;

function FunnelIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="4 4 20 4 14 12.5 14 19 10 21 10 12.5 4 4" />
    </svg>
  );
}

export default function ColumnFilterDropdown({
  options,
  value,
  onChange,
  searchable = false,
  align = "left",
}: {
  options: string[];
  value: ColumnFilterValue;
  onChange: (next: ColumnFilterValue) => void;
  searchable?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isActive = value !== null;

  function openDropdown() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const rawLeft = align === "right" ? rect.right - PANEL_WIDTH : rect.left;
      const left = Math.max(8, Math.min(rawLeft, window.innerWidth - PANEL_WIDTH - 8));
      setPos({ top: rect.bottom + 4, left });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  const visibleOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  function isChecked(option: string) {
    return value === null || value.has(option);
  }

  function toggleOption(option: string) {
    const base = value === null ? new Set(options) : new Set(value);
    if (base.has(option)) base.delete(option);
    else base.add(option);
    onChange(base);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={`p-0.5 rounded transition-colors ${
          isActive ? "text-rise-green" : "text-rise-brown/60 hover:text-rise-black"
        }`}
        aria-label="Filter column"
      >
        <FunnelIcon active={isActive} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH }}
            className="z-50 bg-white rounded-lg border border-gray-200 shadow-lg p-2 normal-case font-normal text-left"
          >
            {searchable && (
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full mb-2 px-2 py-1.5 text-xs rounded-md border border-gray-200 focus:border-rise-green focus:outline-none"
              />
            )}
            <div className="flex items-center justify-between px-1 mb-1.5 pb-1.5 border-b border-gray-100">
              <label className="flex items-center gap-1.5 text-xs font-medium text-rise-black cursor-pointer">
                <input
                  type="checkbox"
                  checked={value === null}
                  onChange={() => onChange(null)}
                  className="accent-rise-green"
                />
                Select All
              </label>
              {isActive && (
                <button
                  type="button"
                  onClick={() => onChange(new Set())}
                  className="text-[11px] text-rise-brown hover:text-rise-black"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {visibleOptions.length === 0 ? (
                <p className="text-xs text-rise-brown px-1 py-2">No matches</p>
              ) : (
                visibleOptions.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-1.5 px-1 py-1 text-xs text-rise-black rounded hover:bg-rise-cream/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked(option)}
                      onChange={() => toggleOption(option)}
                      className="accent-rise-green"
                    />
                    <span className="truncate">{option}</span>
                  </label>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
