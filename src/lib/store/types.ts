import type {
  Participant,
  PingRequest,
  PublicRoom,
  RequestStatus,
  Room,
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
  createRoom(input: { templateId: string }): Promise<CreateRoomResult>;
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
    input: { id: unknown; selections: unknown },
  ): Promise<CreateRequestResult>;
  updateRequestStatus(
    code: string,
    token: string,
    requestId: string,
    status: RequestStatus,
  ): Promise<PingRequest>;
  /** Fires whenever room data changes. Carries no payload; clients refetch. */
  subscribe(code: string, listener: () => void): () => void;
}
