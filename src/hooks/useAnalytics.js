import { useCallback, useRef } from 'react';

export function useAnalytics() {
  const tracked = useRef(new Set());

  const track = useCallback(async (eventType, metadata = {}, options = {}) => {
    const dedupeKey = options.once ? eventType : null;
    if (dedupeKey && tracked.current.has(dedupeKey)) return;
    if (dedupeKey) tracked.current.add(dedupeKey);
    // No-op: analytics disabled (base44 removed)
  }, []);

  return { track };
}

// Standalone fire-and-forget for use outside hooks
export async function trackEvent(eventType, metadata = {}) {
  // No-op: analytics disabled (base44 removed)
}
