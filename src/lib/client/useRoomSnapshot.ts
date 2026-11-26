"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PingRequest, RoomSnapshot } from "@/lib/domain/types";
import { ApiError, api } from "./api";

const POLL_MS = 5000;

export type ConnectionStatus = "connected" | "reconnecting" | "offline";

export interface ConnectionState {
  status: ConnectionStatus;
  /** Korean message for the last failed refresh, if any. */
  error: string | null;
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export interface RoomSnapshotState {
  snapshot: RoomSnapshot | null;
  /** Fatal error (expired, unauthorized, not found) that stops syncing. */
  fatal: ApiError | null;
  /** offline: browser has no network; reconnecting: network is up but the last refresh failed. */
  connection: ConnectionState;
  /** Offset to add to Date.now() to approximate server time. */
  clockOffset: number;
  /** Increments when a request from another sender shows up after the first load. */
  newRequestTick: number;
  refresh: () => Promise<void>;
  applyRequest: (request: PingRequest) => void;
}

/**
 * Keeps a viewer-specific snapshot fresh: SSE change signal for ~instant updates,
 * plus refetch on focus/visibility/reconnect and a slow poll as a safety net
 * (iOS drops background connections, so state is always re-read from the server).
 */
export function useRoomSnapshot(code: string, token: string | null | undefined): RoomSnapshotState {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [fatal, setFatal] = useState<ApiError | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const browserOnline = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [clockOffset, setClockOffset] = useState(0);
  const [newRequestTick, setNewRequestTick] = useState(0);

  const seenIds = useRef<Set<string> | null>(null);
  const inflight = useRef(false);
  const dirty = useRef(false);
  const stopped = useRef(false);

  const refresh = useCallback(async () => {
    if (!token || stopped.current) return;
    if (inflight.current) {
      dirty.current = true;
      return;
    }
    inflight.current = true;
    try {
      do {
        dirty.current = false;
        try {
          const next = await api.getState(code, token);
          if (stopped.current) return;
          setClockOffset(next.serverNow - Date.now());
          if (seenIds.current === null) {
            seenIds.current = new Set(next.requests.map((r) => r.id));
          } else {
            const known = seenIds.current;
            const fresh = next.requests.filter((r) => !known.has(r.id));
            fresh.forEach((r) => known.add(r.id));
            if (fresh.some((r) => r.status === "received")) {
              setNewRequestTick((n) => n + 1);
            }
          }
          setSnapshot(next);
          setRefreshError(null);
          setFatal(null);
        } catch (error) {
          if (stopped.current) return;
          if (error instanceof ApiError && error.isFatal) {
            stopped.current = true;
            setFatal(error);
            return;
          }
          setRefreshError(
            error instanceof Error ? error.message : "서버와 통신하지 못했어요.",
          );
        }
      } while (dirty.current);
    } finally {
      inflight.current = false;
    }
  }, [code, token]);

  const applyRequest = useCallback((request: PingRequest) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      const exists = prev.requests.some((r) => r.id === request.id);
      return {
        ...prev,
        requests: exists
          ? prev.requests.map((r) => (r.id === request.id ? request : r))
          : [...prev.requests, request],
      };
    });
    seenIds.current?.add(request.id);
  }, []);

  useEffect(() => {
    if (!token) return;
    stopped.current = false;
    seenIds.current = null;
    void refresh();

    const source = new EventSource(`/api/rooms/${encodeURIComponent(code)}/events`);
    source.addEventListener("change", () => void refresh());
    source.addEventListener("open", () => void refresh());

    const poll = window.setInterval(() => void refresh(), POLL_MS);
    const onWake = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const onOnline = () => void refresh();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onOnline);

    return () => {
      stopped.current = true;
      source.close();
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onOnline);
    };
  }, [code, token, refresh]);

  const connection: ConnectionState = {
    status: !browserOnline ? "offline" : refreshError !== null ? "reconnecting" : "connected",
    error: refreshError,
  };

  return { snapshot, fatal, connection, clockOffset, newRequestTick, refresh, applyRequest };
}
