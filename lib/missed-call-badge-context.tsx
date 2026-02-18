/**
 * Global context for tracking unseen missed call count.
 * Badge clears automatically when the Calls tab is visited.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { getApiBase } from "./api";
import { getCustomerId, getApiKey } from "./storage";

interface MissedCallBadgeContextValue {
  unseenCount: number;
  refreshCount: () => Promise<void>;
  markAllSeen: () => Promise<void>;
  decrement: () => void;
  reset: () => void;
}

const MissedCallBadgeContext = createContext<MissedCallBadgeContextValue>({
  unseenCount: 0,
  refreshCount: async () => {},
  markAllSeen: async () => {},
  decrement: () => {},
  reset: () => {},
});

export function MissedCallBadgeProvider({ children }: { children: React.ReactNode }) {
  const [unseenCount, setUnseenCount] = useState(0);
  const fetchingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const cid = await getCustomerId();
      if (!cid) { setUnseenCount(0); return; }
      const apiKey = await getApiKey();
      const headers: HeadersInit = apiKey ? { "X-Api-Key": apiKey } : {};
      const res = await fetch(`${getApiBase()}/api/calls/${encodeURIComponent(cid)}/unseen-count`, { headers });
      const data = await res.json();
      if (data.ok) setUnseenCount(data.count ?? 0);
    } catch (e) {
      console.log("[MissedCallBadge] Error refreshing count:", e);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const markAllSeen = useCallback(async () => {
    try {
      const cid = await getCustomerId();
      if (!cid) return;
      const apiKey = await getApiKey();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(apiKey ? { "X-Api-Key": apiKey } : {}),
      };
      await fetch(`${getApiBase()}/api/calls/${encodeURIComponent(cid)}/mark-all-seen`, {
        method: "POST",
        headers,
      });
      setUnseenCount(0);
    } catch (e) {
      console.log("[MissedCallBadge] Error marking seen:", e);
    }
  }, []);

  const decrement = useCallback(() => {
    setUnseenCount((prev) => Math.max(0, prev - 1));
  }, []);

  const reset = useCallback(() => setUnseenCount(0), []);

  return (
    <MissedCallBadgeContext.Provider value={{ unseenCount, refreshCount, markAllSeen, decrement, reset }}>
      {children}
    </MissedCallBadgeContext.Provider>
  );
}

export function useMissedCallBadge() {
  return useContext(MissedCallBadgeContext);
}
