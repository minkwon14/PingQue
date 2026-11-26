import { PRESENCE_TTL_MS } from "@/lib/config";
import { normalizeJoinCode } from "@/lib/domain/rules";

type RoomPresence = Map<string, number>;

const globalForPresence = globalThis as unknown as { __pingquePresence?: Map<string, RoomPresence> };

function rooms(): Map<string, RoomPresence> {
  globalForPresence.__pingquePresence ??= new Map();
  return globalForPresence.__pingquePresence;
}

/**
 * Presence is derived from state fetches (SSE open, focus, 5s poll), so it needs no store
 * or schema change. It is kept in process memory and is approximate by design.
 */
export function touchPresence(code: string, participantId: string, now = Date.now()): void {
  const key = normalizeJoinCode(code);
  let room = rooms().get(key);
  if (!room) {
    room = new Map();
    rooms().set(key, room);
  }
  room.set(participantId, now);
}

export function clearPresence(code: string, participantId: string): void {
  const key = normalizeJoinCode(code);
  const room = rooms().get(key);
  if (!room) return;
  room.delete(participantId);
  if (room.size === 0) rooms().delete(key);
}

export function connectedCount(code: string, now = Date.now()): number {
  const key = normalizeJoinCode(code);
  const room = rooms().get(key);
  if (!room) return 0;
  let count = 0;
  for (const [id, seenAt] of room) {
    if (now - seenAt <= PRESENCE_TTL_MS) count++;
    else room.delete(id);
  }
  if (room.size === 0) rooms().delete(key);
  return count;
}
