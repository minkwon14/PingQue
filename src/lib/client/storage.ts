"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the session just won't persist.
  }
  listeners.forEach((l) => l());
}

/** `undefined` during SSR/hydration, then the stored string or `null`. */
export function useStoredValue(key: string): string | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => readStored(key),
    () => undefined,
  );
}

export const hostKey = (code: string) => `pingque:host:${code}`;
export const deviceKey = (code: string) => `pingque:device:${code}`;
export const PROFILE_KEY = "pingque:profile";

export interface DeviceRecord {
  token: string;
  name: string;
  role: string;
}

export function parseDevice(raw: string | null | undefined): DeviceRecord | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<DeviceRecord>;
    return typeof v.token === "string" && typeof v.name === "string" && typeof v.role === "string"
      ? { token: v.token, name: v.name, role: v.role }
      : null;
  } catch {
    return null;
  }
}
