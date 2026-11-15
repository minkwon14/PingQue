"use client";

import { useEffect, useState } from "react";

/** Re-renders on an interval and returns the current epoch ms. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Wall-clock read for event handlers (kept out of component bodies for the purity lint). */
export function currentTime(): number {
  return Date.now();
}
