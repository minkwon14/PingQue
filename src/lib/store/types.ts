import type {
  Announcement,
  Participant,
  PingRequest,
  PublicRoom,
  RequestStatus,
  Room,
  RoomButton,
  RoomSnapshot,
} from "@/lib/domain/types";

export interface CreateRoomResult {
  room: Room;
  /** Secret for the host device. Only the hash is stored. */
  hostToken: string;
}

export interface JoinRoomResult {
  room: Room;
  participant: Participant;
  /** Secret for this participant device. Only the hash is stored. */
  token: string;
}

export interface CreateRequestResult {
  request: PingRequest;
  /** false when the same request id was already stored (idempotent replay). */
  created: boolean;
}

/**
 * Data access boundary. Every operation throws `DomainError` on rule violations
 * (expired room, full room, rate limit, bad transition, ...).
 */
export interface RoomStore {
  createRoom(input: { templateId: string; buttons?: unknown }): Promise<CreateRoomResult>;
  getPublicRoom(code: string): Promise<PublicRoom>;
  /** Passing an existing device token re-attaches to the same participant. */
  joinRoom(
    code: string,
    input: { name: unknown; role: unknown; token?: string },
  ): Promise<JoinRoomResult>;
  getSnapshot(code: string, token: string): Promise<RoomSnapshot>;
  createRequest(
    code: string,
    token: string,
    /** `text` (a quick button) takes precedence over `selections` (template steps). */
    input: { id: unknown; selections?: unknown; text?: unknown },
  ): Promise<CreateRequestResult>;
  /** Host only. Replaces the room's shared quick buttons. */
  setButtons(code: string, token: string, buttons: unknown): Promise<RoomButton[]>;
  /** Host only. Makes `text` the active announcement and keeps a short history. */
  announce(code: string, token: string, text: unknown): Promise<Announcement>;
  /** Host only. Closes the room for everyone; later joins and fetches fail with `room_closed`. */
  closeRoom(code: string, token: string): Promise<void>;
  /** Participant only. Removes the caller, cancelling their active requests first. */
  leaveRoom(code: string, token: string): Promise<{ participantId: string }>;
  /** Participant only. Changes the caller's own name and role (same validation as joining). */
  updateProfile(
    code: string,
    token: string,
    input: { name: unknown; role: unknown },
  ): Promise<Participant>;
  updateRequestStatus(
    code: string,
    token: string,
    requestId: string,
    status: RequestStatus,
  ): Promise<PingRequest>;
  /** Fires whenever room data changes. Carries no payload; clients refetch. */
  subscribe(code: string, listener: () => void): () => void;
}
