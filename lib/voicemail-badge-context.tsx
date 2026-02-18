/**
 * Global context for tracking unread voicemail count.
 * Used to show badge on the Voicemail tab and keep it in sync
 * across screens without prop drilling.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { getCustomerId } from "./storage";
import { getNewVoicemailCount } from "./voicemail";

interface VoicemailBadgeContextValue {
  unreadCount: number;
  refreshCount: () => Promise<void>;
  decrement: () => void;
  reset: () => void;
}

const VoicemailBadgeContext = createContext<VoicemailBadgeContextValue>({
  unreadCount: 0,
  refreshCount: async () => {},
  decrement: () => {},
  reset: () => {},
});

export function VoicemailBadgeProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const fetchingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const cid = await getCustomerId();
      if (!cid) {
        setUnreadCount(0);
        return;
      }
      const count = await getNewVoicemailCount(cid);
      setUnreadCount(count);
    } catch (e) {
      console.log("[VoicemailBadge] Error refreshing count:", e);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const decrement = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const reset = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <VoicemailBadgeContext.Provider value={{ unreadCount, refreshCount, decrement, reset }}>
      {children}
    </VoicemailBadgeContext.Provider>
  );
}

export function useVoicemailBadge() {
  return useContext(VoicemailBadgeContext);
}
