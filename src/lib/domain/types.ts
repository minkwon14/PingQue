export type RequestStatus = "received" | "confirmed" | "done" | "cancelled";

export type ActorKind = "receiver" | "participant";

/** One-tap request button shared with everyone in the room (set by the host). */
export interface RoomButton {
  id: string;
  label: string;
}

/** Host announcement shown to everyone in the room. */
export interface Announcement {
  id: string;
  text: string;
  createdAt: number;
}

export interface Room {
  id: string;
  code: string;
  templateId: string;
  maxParticipants: number;
  buttons: RoomButton[];
  /** Host-managed one-tap announcement phrases. */
  announcementPresets: string[];
  /** Host-managed role choices offered when joining (custom text is also accepted). */
  roles: string[];
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
  roles: string[];
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
  /** Newest first. The first entry is the active announcement. */
  announcements: Announcement[];
  serverNow: number;
}
