"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Triggers the async, chunked Mixmax refresh (POST /api/refresh/mixmax) and
 * polls /api/mixmax/status until the chain finishes before calling
 * router.refresh(). A direct blocking fetch of every Mixmax sequence is too
 * slow for a single serverless function invocation and times out (504).
 */
export function useMixmaxRefresh() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/refresh/mixmax", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

      if (body.started) {
        while (true) {
          await new Promise((r) => setTimeout(r, 2000));
          const statusRes = await fetch("/api/mixmax/status", { cache: "no-store" });
          const status = await statusRes.json().catch(() => ({ running: false }));
          if (!status.running) break;
        }
      }

      router.refresh();
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  return { refresh, refreshing, refreshError };
}
