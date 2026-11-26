export type RequestStatus = "received" | "confirmed" | "done" | "cancelled";

export type ActorKind = "receiver" | "participant";

/** One-tap request button shared with everyone in the room (set by the host). */
export interface RoomButton {
  id: string;
  label: string;
}

export interface Room {
  id: string;
  code: string;
  templateId: string;
  maxParticipants: number;
  buttons: RoomButton[];
  createdAt: number;
  expiresAt: number;
}

/** Someone who receives and handles requests. The free tier has exactly one (the host). */
export interface Receiver {
  id: string;
  roomId: string;
  name: string;
  isHost: boolean;
}

export interface Participant {
  id: string;
  roomId: string;
  name: string;
  role: string;
  joinedAt: number;
}

export interface PingRequest {
  /** Client-generated UUID; doubles as the idempotency key. */
  id: string;
  roomId: string;
  senderId: string;
  targetId: string;
  templateId: string;
  /** Selected option ids, one per template step. */
  selections: string[];
  item: string;
  qualifiers: string[];
  action: string;
  /** Display string snapshot, e.g. "키보드 · 내 모니터 · 더 크게 ↑". */
  label: string;
  status: RequestStatus;
  createdAt: number;
  confirmedAt: number | null;
  doneAt: number | null;
  cancelledAt: number | null;
}

export interface PublicRoom {
  code: string;
  templateId: string;
  expiresAt: number;
  participantCount: number;
  maxParticipants: number;
}

export type Viewer =
  | { kind: "receiver"; receiverId: string }
  | { kind: "participant"; participant: Participant };

export interface RoomSnapshot {
  room: Room;
  viewer: Viewer;
  /** Receivers see everyone; participants see only themselves. */
  participants: Participant[];
  participantCount: number;
  /** Participants whose device fetched state recently. Filled in by the state route. */
  connectedCount?: number;
  /** Receivers see all requests; participants see only their own. */
  requests: PingRequest[];
  serverNow: number;
}
