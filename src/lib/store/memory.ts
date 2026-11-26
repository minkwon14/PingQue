import {
  ANNOUNCEMENT_HISTORY_SIZE,
  ANNOUNCEMENT_RATE_LIMIT_MS,
  MAX_PARTICIPANTS,
  REQUEST_RATE_LIMIT_MS,
  ROOM_TTL_MS,
} from "@/lib/config";
import { DomainError } from "@/lib/domain/errors";
import {
  canTransition,
  generateJoinCode,
  isActive,
  isExpired,
  isRequestStatus,
  isUuid,
  normalizeJoinCode,
  rateLimitRetryAfter,
  resolveSelections,
  resolveText,
  validateAnnouncementText,
  validateButtons,
  validateParticipantInput,
} from "@/lib/domain/rules";
import { getTemplate, type Template } from "@/lib/domain/templates";
import type {
  Announcement,
  Participant,
  PingRequest,
  PublicRoom,
  Receiver,
  RequestStatus,
  Room,
  RoomButton,
  RoomSnapshot,
} from "@/lib/domain/types";
import { hashToken, newToken, randomInt, randomUUID } from "./crypto";
import type {
  CreateRequestResult,
  CreateRoomResult,
  JoinRoomResult,
  RoomStore,
} from "./types";

interface StoredReceiver extends Receiver {
  tokenHash: string;
}

interface StoredParticipant extends Participant {
  tokenHash: string;
}

interface RoomState {
  room: Room;
  template: Template;
  receivers: StoredReceiver[];
  participants: StoredParticipant[];
  requests: PingRequest[];
  announcements: Announcement[];
  closed: boolean;
}

type Actor =
  | { kind: "receiver"; receiver: StoredReceiver }
  | { kind: "participant"; participant: StoredParticipant };

/** Keep expired rooms briefly so clients get "expired" instead of "not found". */
const PURGE_AFTER_EXPIRY_MS = 10 * 60 * 1000;

export interface MemoryStoreOptions {
  now?: () => number;
  roomTtlMs?: number;
  maxParticipants?: number;
  rateLimitMs?: number;
}

export class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, RoomState>();
  private requestIndex = new Map<string, RoomState>();
  private listeners = new Map<string, Set<() => void>>();
  private readonly now: () => number;
  private readonly roomTtlMs: number;
  private readonly maxParticipants: number;
  private readonly rateLimitMs: number;

  constructor(options: MemoryStoreOptions = {}) {
    this.now = options.now ?? Date.now;
    this.roomTtlMs = options.roomTtlMs ?? ROOM_TTL_MS;
    this.maxParticipants = options.maxParticipants ?? MAX_PARTICIPANTS;
    this.rateLimitMs = options.rateLimitMs ?? REQUEST_RATE_LIMIT_MS;
  }

  async createRoom(input: { templateId: string; buttons?: unknown }): Promise<CreateRoomResult> {
    const template = getTemplate(input.templateId);
    if (!template) throw new DomainError("invalid_input", "알 수 없는 템플릿이에요.");
    const buttons = input.buttons === undefined ? [] : validateButtons(input.buttons);
    this.purgeOldRooms();

    let code = generateJoinCode(randomInt);
    while (this.rooms.has(code)) code = generateJoinCode(randomInt);

    const now = this.now();
    const room: Room = {
      id: randomUUID(),
      code,
      templateId: template.id,
      maxParticipants: this.maxParticipants,
      buttons,
      createdAt: now,
      expiresAt: now + this.roomTtlMs,
    };
    const hostToken = newToken();
    const host: StoredReceiver = {
      id: randomUUID(),
      roomId: room.id,
      name: "호스트",
      isHost: true,
      tokenHash: hashToken(hostToken),
    };
    this.rooms.set(code, {
      room,
      template,
      receivers: [host],
      participants: [],
      requests: [],
      announcements: [],
      closed: false,
    });
    return { room, hostToken };
  }

  async getPublicRoom(code: string): Promise<PublicRoom> {
    const { room, participants } = this.requireActiveRoom(code);
    return {
      code: room.code,
      templateId: room.templateId,
      expiresAt: room.expiresAt,
      participantCount: participants.length,
      maxParticipants: room.maxParticipants,
    };
  }

  async joinRoom(
    code: string,
    input: { name: unknown; role: unknown; token?: string },
  ): Promise<JoinRoomResult> {
    const state = this.requireActiveRoom(code);
    const { name, role } = validateParticipantInput(state.template, input);

    const existing = input.token
      ? state.participants.find((p) => p.tokenHash === hashToken(input.token as string))
      : undefined;
    if (existing && input.token) {
      existing.name = name;
      existing.role = role;
      this.notify(state.room.code);
      return {
        room: state.room,
        participant: toParticipant(existing),
        token: input.token,
      };
    }

    if (state.participants.length >= state.room.maxParticipants) {
      throw new DomainError("room_full", "방이 가득 찼어요.");
    }
    const token = newToken();
    const participant: StoredParticipant = {
      id: randomUUID(),
      roomId: state.room.id,
      name,
      role,
      joinedAt: this.now(),
      tokenHash: hashToken(token),
    };
    state.participants.push(participant);
    this.notify(state.room.code);
    return { room: state.room, participant: toParticipant(participant), token };
  }

  async getSnapshot(code: string, token: string): Promise<RoomSnapshot> {
    const state = this.requireActiveRoom(code);
    const actor = this.authenticate(state, token);
    const base = {
      room: state.room,
      participantCount: state.participants.length,
      announcements: state.announcements.map((a) => ({ ...a })),
      serverNow: this.now(),
    };
    if (actor.kind === "receiver") {
      return {
        ...base,
        viewer: { kind: "receiver", receiverId: actor.receiver.id },
        participants: state.participants.map(toParticipant),
        requests: state.requests.map(copy),
      };
    }
    const me = toParticipant(actor.participant);
    return {
      ...base,
      viewer: { kind: "participant", participant: me },
      participants: [me],
      requests: state.requests.filter((r) => r.senderId === me.id).map(copy),
    };
  }

  async createRequest(
    code: string,
    token: string,
    input: { id: unknown; selections?: unknown; text?: unknown },
  ): Promise<CreateRequestResult> {
    const state = this.requireActiveRoom(code);
    const actor = this.authenticate(state, token);
    if (actor.kind !== "participant") {
      throw new DomainError("forbidden", "참가자만 요청을 보낼 수 있어요.");
    }
    if (!isUuid(input.id)) {
      throw new DomainError("invalid_input", "요청 ID가 올바르지 않아요.");
    }
    const sender = actor.participant;

    const existing = this.requestIndex.get(input.id);
    if (existing) {
      const stored = existing.requests.find((r) => r.id === input.id);
      if (stored && stored.senderId === sender.id) {
        return { request: copy(stored), created: false };
      }
      throw new DomainError("id_conflict", "이미 사용된 요청 ID예요.");
    }

    const resolved =
      input.text !== undefined
        ? resolveText(input.text)
        : resolveSelections(state.template, input.selections);

    const now = this.now();
    const last = state.requests
      .filter((r) => r.senderId === sender.id)
      .reduce<number | undefined>(
        (max, r) => (max === undefined || r.createdAt > max ? r.createdAt : max),
        undefined,
      );
    const retryAfter = rateLimitRetryAfter(last, now, this.rateLimitMs);
    if (retryAfter > 0) {
      throw new DomainError("rate_limited", "너무 빠르게 보내고 있어요.", retryAfter);
    }

    const target = state.receivers.find((r) => r.isHost) ?? state.receivers[0];
    const request: PingRequest = {
      id: input.id,
      roomId: state.room.id,
      senderId: sender.id,
      targetId: target.id,
      templateId: state.template.id,
      ...resolved,
      status: "received",
      createdAt: now,
      confirmedAt: null,
      doneAt: null,
      cancelledAt: null,
    };
    state.requests.push(request);
    this.requestIndex.set(request.id, state);
    this.notify(state.room.code);
    return { request: copy(request), created: true };
  }

  async setButtons(code: string, token: string, buttons: unknown): Promise<RoomButton[]> {
    const state = this.requireActiveRoom(code);
    if (this.authenticate(state, token).kind !== "receiver") {
      throw new DomainError("forbidden", "호스트만 버튼을 바꿀 수 있어요.");
    }
    state.room = { ...state.room, buttons: validateButtons(buttons) };
    this.notify(state.room.code);
    return state.room.buttons.map((b) => ({ ...b }));
  }

  async announce(code: string, token: string, text: unknown): Promise<Announcement> {
    const state = this.requireActiveRoom(code);
    if (this.authenticate(state, token).kind !== "receiver") {
      throw new DomainError("forbidden", "호스트만 공지를 보낼 수 있어요.");
    }
    const value = validateAnnouncementText(text);
    const now = this.now();
    const retryAfter = rateLimitRetryAfter(
      state.announcements[0]?.createdAt,
      now,
      ANNOUNCEMENT_RATE_LIMIT_MS,
    );
    if (retryAfter > 0) {
      throw new DomainError("rate_limited", "공지를 너무 빠르게 보내고 있어요.", retryAfter);
    }
    const announcement: Announcement = { id: randomUUID(), text: value, createdAt: now };
    state.announcements = [announcement, ...state.announcements].slice(0, ANNOUNCEMENT_HISTORY_SIZE);
    this.notify(state.room.code);
    return { ...announcement };
  }

  async closeRoom(code: string, token: string): Promise<void> {
    const state = this.requireActiveRoom(code);
    if (this.authenticate(state, token).kind !== "receiver") {
      throw new DomainError("forbidden", "호스트만 방을 종료할 수 있어요.");
    }
    state.closed = true;
    this.notify(state.room.code);
  }

  async leaveRoom(code: string, token: string): Promise<{ participantId: string }> {
    const state = this.requireActiveRoom(code);
    const actor = this.authenticate(state, token);
    if (actor.kind !== "participant") {
      throw new DomainError("forbidden", "참가자만 나갈 수 있어요.");
    }
    const leaving = actor.participant;
    const now = this.now();
    for (const request of state.requests) {
      if (request.senderId === leaving.id && isActive(request.status)) {
        request.status = "cancelled";
        request.cancelledAt = now;
      }
    }
    state.participants = state.participants.filter((p) => p.id !== leaving.id);
    this.notify(state.room.code);
    return { participantId: leaving.id };
  }

  async updateProfile(
    code: string,
    token: string,
    input: { name: unknown; role: unknown },
  ): Promise<Participant> {
    const state = this.requireActiveRoom(code);
    const actor = this.authenticate(state, token);
    if (actor.kind !== "participant") {
      throw new DomainError("forbidden", "참가자만 내 정보를 바꿀 수 있어요.");
    }
    const { name, role } = validateParticipantInput(state.template, input);
    actor.participant.name = name;
    actor.participant.role = role;
    this.notify(state.room.code);
    return toParticipant(actor.participant);
  }

  async updateRequestStatus(
    code: string,
    token: string,
    requestId: string,
    status: RequestStatus,
  ): Promise<PingRequest> {
    const state = this.requireActiveRoom(code);
    const actor = this.authenticate(state, token);
    if (!isRequestStatus(status)) {
      throw new DomainError("invalid_input", "올바르지 않은 상태예요.");
    }
    const request = state.requests.find((r) => r.id === requestId);
    if (!request) throw new DomainError("not_found", "요청을 찾을 수 없어요.");

    if (actor.kind === "participant" && request.senderId !== actor.participant.id) {
      throw new DomainError("forbidden", "내 요청만 취소할 수 있어요.");
    }
    if (actor.kind === "receiver" && request.targetId !== actor.receiver.id) {
      throw new DomainError("forbidden", "다른 수신자의 요청이에요.");
    }

    if (request.status === status) return copy(request);
    if (!canTransition(actor.kind, request.status, status)) {
      throw new DomainError("invalid_transition", "지금은 바꿀 수 없는 상태예요.");
    }

    const now = this.now();
    request.status = status;
    if (status === "confirmed") request.confirmedAt = now;
    if (status === "done") request.doneAt = now;
    if (status === "cancelled") request.cancelledAt = now;
    this.notify(state.room.code);
    return copy(request);
  }

  subscribe(code: string, listener: () => void): () => void {
    const key = normalizeJoinCode(code);
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(key);
    };
  }

  private notify(code: string) {
    for (const listener of this.listeners.get(code) ?? []) {
      try {
        listener();
      } catch (error) {
        console.error("room listener failed", error);
      }
    }
  }

  private requireRoom(code: string): RoomState {
    const state = this.rooms.get(normalizeJoinCode(code));
    if (!state) throw new DomainError("not_found", "방을 찾을 수 없어요.");
    return state;
  }

  private requireActiveRoom(code: string): RoomState {
    const state = this.requireRoom(code);
    if (state.closed) {
      throw new DomainError("room_closed", "호스트가 방을 종료했어요.");
    }
    if (isExpired(state.room, this.now())) {
      throw new DomainError("room_expired", "방이 종료되었어요.");
    }
    return state;
  }

  private authenticate(state: RoomState, token: string): Actor {
    if (!token) throw new DomainError("unauthorized", "인증이 필요해요.");
    const hash = hashToken(token);
    const receiver = state.receivers.find((r) => r.tokenHash === hash);
    if (receiver) return { kind: "receiver", receiver };
    const participant = state.participants.find((p) => p.tokenHash === hash);
    if (participant) return { kind: "participant", participant };
    throw new DomainError("unauthorized", "인증이 필요해요.");
  }

  private purgeOldRooms() {
    const cutoff = this.now() - PURGE_AFTER_EXPIRY_MS;
    for (const [code, state] of this.rooms) {
      if (state.room.expiresAt < cutoff) {
        for (const r of state.requests) this.requestIndex.delete(r.id);
        this.rooms.delete(code);
      }
    }
  }
}

function copy(r: PingRequest): PingRequest {
  return { ...r, selections: [...r.selections], qualifiers: [...r.qualifiers] };
}

function toParticipant(p: StoredParticipant): Participant {
  return {
    id: p.id,
    roomId: p.roomId,
    name: p.name,
    role: p.role,
    joinedAt: p.joinedAt,
  };
}
