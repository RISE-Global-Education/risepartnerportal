"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const START_EVENT = "rise:navigation-start";

// Safety net: if a navigation never commits (e.g. it errored or was cancelled),
// don't leave the bar spinning forever.
const MAX_VISIBLE_MS = 20_000;

/**
 * Call before a programmatic navigation (router.push / router.back) so the
 * global top bar shows while the next page loads. Plain <a>/<Link> clicks are
 * picked up automatically.
 */
export function startNavigationProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(START_EVENT));
  }
}

function isInternalNavigation(e: MouseEvent): boolean {
  if (e.defaultPrevented || e.button !== 0) return false;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;

  const anchor = (e.target as Element | null)?.closest?.("a");
  if (!anchor || !anchor.href) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const next = new URL(anchor.href, window.location.href);
  if (next.origin !== window.location.origin) return false;

  // Same page (or only the hash differs) — nothing will load.
  const current = window.location;
  return next.pathname !== current.pathname || next.search !== current.search;
}

/**
 * Thin animated bar pinned to the top of the viewport while a client-side
 * navigation is in flight. Hidden again as soon as the URL changes.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlKey = `${pathname}?${searchParams.toString()}`;

  // The URL the navigation started from. The bar shows only while the URL is
  // still that one, so it disappears the moment the new route commits.
  const [startedAt, setStartedAt] = useState<string | null>(null);
  // URL moved on → that navigation is done. Clear it (during render, per React's
  // "adjusting state when a prop changes") so returning to the same URL later
  // doesn't resurrect the bar.
  if (startedAt !== null && startedAt !== urlKey) {
    setStartedAt(null);
  }
  const active = startedAt === urlKey;

  useEffect(() => {
    const start = () => setStartedAt(urlKey);
    const onClick = (e: MouseEvent) => {
      if (isInternalNavigation(e)) start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    window.addEventListener(START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      window.removeEventListener(START_EVENT, start);
    };
  }, [urlKey]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setStartedAt(null), MAX_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-rise-green/15"
    >
      <div className="h-full w-full bg-rise-green animate-loading-bar" />
    </div>
  );
}
