import {
  createClient,
  type PostgrestError,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { MAX_PARTICIPANTS, REQUEST_RATE_LIMIT_MS, ROOM_TTL_MS } from "@/lib/config";
import { DomainError, type DomainErrorCode } from "@/lib/domain/errors";
import {
  canTransition,
  generateJoinCode,
  isExpired,
  isRequestStatus,
  isUuid,
  normalizeJoinCode,
  rateLimitRetryAfter,
  resolveSelections,
  validateParticipantInput,
} from "@/lib/domain/rules";
import { getTemplate } from "@/lib/domain/templates";
import type {
  Participant,
  PingRequest,
  PublicRoom,
  RequestStatus,
  Room,
  RoomSnapshot,
} from "@/lib/domain/types";
import { hashToken, newToken, randomInt } from "./crypto";
import type {
  CreateRequestResult,
  CreateRoomResult,
  JoinRoomResult,
  RoomStore,
} from "./types";

interface RoomRow {
  id: string;
  code: string;
  template_id: string;
  max_participants: number;
  created_at: string;
  expires_at: string;
}

interface ReceiverRow {
  id: string;
  room_id: string;
  is_host: boolean;
}

interface ParticipantRow {
  id: string;
  room_id: string;
  name: string;
  role: string;
  joined_at: string;
}

interface RequestRow {
  id: string;
  room_id: string;
  sender_id: string;
  target_id: string;
  template_id: string;
  selections: string[];
  item: string;
  qualifiers: string[];
  action: string;
  label: string;
  status: RequestStatus;
  created_at: string;
  confirmed_at: string | null;
  done_at: string | null;
  cancelled_at: string | null;
}

type Actor =
  | { kind: "receiver"; receiver: ReceiverRow }
  | { kind: "participant"; participant: ParticipantRow };

const DB_ERROR_CODES: DomainErrorCode[] = [
  "room_expired",
  "room_full",
  "rate_limited",
  "invalid_transition",
  "not_found",
];

function fail(error: PostgrestError): never {
  const known = DB_ERROR_CODES.find((code) => error.message.includes(code));
  if (known) {
    throw new DomainError(known, undefined, known === "rate_limited" ? REQUEST_RATE_LIMIT_MS : undefined);
  }
  throw new Error(`supabase: ${error.message}`);
}

function unwrap<T>(result: { data: T | null; error: PostgrestError | null }): T | null {
  if (result.error) fail(result.error);
  return result.data;
}

const ms = (iso: string) => Date.parse(iso);
const msOrNull = (iso: string | null) => (iso ? Date.parse(iso) : null);

const toRoom = (r: RoomRow): Room => ({
  id: r.id,
  code: r.code,
  templateId: r.template_id,
  maxParticipants: r.max_participants,
  createdAt: ms(r.created_at),
  expiresAt: ms(r.expires_at),
});

const toParticipant = (p: ParticipantRow): Participant => ({
  id: p.id,
  roomId: p.room_id,
  name: p.name,
  role: p.role,
  joinedAt: ms(p.joined_at),
});

const toRequest = (r: RequestRow): PingRequest => ({
  id: r.id,
  roomId: r.room_id,
  senderId: r.sender_id,
  targetId: r.target_id,
  templateId: r.template_id,
  selections: r.selections,
  item: r.item,
  qualifiers: r.qualifiers,
  action: r.action,
  label: r.label,
  status: r.status,
  createdAt: ms(r.created_at),
  confirmedAt: msOrNull(r.confirmed_at),
  doneAt: msOrNull(r.done_at),
  cancelledAt: msOrNull(r.cancelled_at),
});

interface SharedChannel {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
}

export class SupabaseRoomStore implements RoomStore {
  private channels = new Map<string, SharedChannel>();

  constructor(private readonly db: SupabaseClient) {}

  static fromEnv(env: { url: string; serviceRoleKey: string }): SupabaseRoomStore {
    return new SupabaseRoomStore(
      createClient(env.url, env.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
  }

  async createRoom(input: { templateId: string }): Promise<CreateRoomResult> {
    const template = getTemplate(input.templateId);
    if (!template) throw new DomainError("invalid_input", "알 수 없는 템플릿이에요.");

    const now = Date.now();
    let room: RoomRow | null = null;
    for (let attempt = 0; attempt < 5 && !room; attempt++) {
      const result = await this.db
        .from("rooms")
        .insert({
          code: generateJoinCode(randomInt),
          template_id: template.id,
          max_participants: MAX_PARTICIPANTS,
          created_at: new Date(now).toISOString(),
          expires_at: new Date(now + ROOM_TTL_MS).toISOString(),
        })
        .select()
        .single();
      if (result.error?.code === "23505") continue;
      room = unwrap(result as { data: RoomRow | null; error: PostgrestError | null });
    }
    if (!room) throw new Error("supabase: could not allocate a unique room code");

    const hostToken = newToken();
    const receiver = await this.db.from("room_receivers").insert({
      room_id: room.id,
      name: "호스트",
      is_host: true,
      token_hash: hashToken(hostToken),
    });
    if (receiver.error) {
      await this.db.from("rooms").delete().eq("id", room.id);
      fail(receiver.error);
    }
    return { room: toRoom(room), hostToken };
  }

  async getPublicRoom(code: string): Promise<PublicRoom> {
    const room = await this.requireActiveRoom(code);
    const count = await this.db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);
    if (count.error) fail(count.error);
    return {
      code: room.code,
      templateId: room.template_id,
      expiresAt: ms(room.expires_at),
      participantCount: count.count ?? 0,
      maxParticipants: room.max_participants,
    };
  }

  async joinRoom(
    code: string,
    input: { name: unknown; role: unknown; token?: string },
  ): Promise<JoinRoomResult> {
    const room = await this.requireActiveRoom(code);
    const template = getTemplate(room.template_id);
    if (!template) throw new Error(`unknown template ${room.template_id}`);
    const { name, role } = validateParticipantInput(template, input);

    if (input.token) {
      const existing = unwrap(
        (await this.db
          .from("participants")
          .update({ name, role })
          .eq("room_id", room.id)
          .eq("token_hash", hashToken(input.token))
          .select()
          .maybeSingle()) as { data: ParticipantRow | null; error: PostgrestError | null },
      );
      if (existing) {
        return { room: toRoom(room), participant: toParticipant(existing), token: input.token };
      }
    }

    const token = newToken();
    const created = unwrap(
      (await this.db
        .from("participants")
        .insert({ room_id: room.id, name, role, token_hash: hashToken(token) })
        .select()
        .single()) as { data: ParticipantRow | null; error: PostgrestError | null },
    );
    if (!created) throw new Error("supabase: participant insert returned no row");
    return { room: toRoom(room), participant: toParticipant(created), token };
  }

  async getSnapshot(code: string, token: string): Promise<RoomSnapshot> {
    const room = await this.requireActiveRoom(code);
    const actor = await this.authenticate(room, token);

    const countResult = await this.db
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);
    if (countResult.error) fail(countResult.error);
    const base = {
      room: toRoom(room),
      participantCount: countResult.count ?? 0,
      serverNow: Date.now(),
    };

    if (actor.kind === "receiver") {
      const [participants, requests] = await Promise.all([
        this.db.from("participants").select().eq("room_id", room.id).order("joined_at"),
        this.db.from("requests").select().eq("room_id", room.id).order("created_at"),
      ]);
      return {
        ...base,
        viewer: { kind: "receiver", receiverId: actor.receiver.id },
        participants: ((unwrap(participants as never) ?? []) as ParticipantRow[]).map(toParticipant),
        requests: ((unwrap(requests as never) ?? []) as RequestRow[]).map(toRequest),
      };
    }

    const requests = await this.db
      .from("requests")
      .select()
      .eq("room_id", room.id)
      .eq("sender_id", actor.participant.id)
      .order("created_at");
    const me = toParticipant(actor.participant);
    return {
      ...base,
      viewer: { kind: "participant", participant: me },
      participants: [me],
      requests: ((unwrap(requests as never) ?? []) as RequestRow[]).map(toRequest),
    };
  }

  async createRequest(
    code: string,
    token: string,
    input: { id: unknown; selections: unknown },
  ): Promise<CreateRequestResult> {
    const room = await this.requireActiveRoom(code);
    const actor = await this.authenticate(room, token);
    if (actor.kind !== "participant") {
      throw new DomainError("forbidden", "참가자만 요청을 보낼 수 있어요.");
    }
    if (!isUuid(input.id)) {
      throw new DomainError("invalid_input", "요청 ID가 올바르지 않아요.");
    }
    const sender = actor.participant;

    const existing = unwrap(
      (await this.db.from("requests").select().eq("id", input.id).maybeSingle()) as {
        data: RequestRow | null;
        error: PostgrestError | null;
      },
    );
    if (existing) {
      if (existing.sender_id === sender.id) {
        return { request: toRequest(existing), created: false };
      }
      throw new DomainError("id_conflict", "이미 사용된 요청 ID예요.");
    }

    const template = getTemplate(room.template_id);
    if (!template) throw new Error(`unknown template ${room.template_id}`);
    const resolved = resolveSelections(template, input.selections);

    const last = unwrap(
      (await this.db
        .from("requests")
        .select("created_at")
        .eq("sender_id", sender.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()) as { data: { created_at: string } | null; error: PostgrestError | null },
    );
    const retryAfter = rateLimitRetryAfter(
      last ? ms(last.created_at) : undefined,
      Date.now(),
      REQUEST_RATE_LIMIT_MS,
    );
    if (retryAfter > 0) {
      throw new DomainError("rate_limited", "너무 빠르게 보내고 있어요.", retryAfter);
    }

    const target = unwrap(
      (await this.db
        .from("room_receivers")
        .select()
        .eq("room_id", room.id)
        .eq("is_host", true)
        .single()) as { data: ReceiverRow | null; error: PostgrestError | null },
    );
    if (!target) throw new Error("supabase: room has no host receiver");

    const created = unwrap(
      (await this.db
        .from("requests")
        .insert({
          id: input.id,
          room_id: room.id,
          sender_id: sender.id,
          target_id: target.id,
          template_id: template.id,
          selections: resolved.selections,
          item: resolved.item,
          qualifiers: resolved.qualifiers,
          action: resolved.action,
          label: resolved.label,
        })
        .select()
        .single()) as { data: RequestRow | null; error: PostgrestError | null },
    );
    if (!created) throw new Error("supabase: request insert returned no row");
    return { request: toRequest(created), created: true };
  }

  async updateRequestStatus(
    code: string,
    token: string,
    requestId: string,
    status: RequestStatus,
  ): Promise<PingRequest> {
    const room = await this.requireActiveRoom(code);
    const actor = await this.authenticate(room, token);
    if (!isRequestStatus(status)) {
      throw new DomainError("invalid_input", "올바르지 않은 상태예요.");
    }
    if (!isUuid(requestId)) throw new DomainError("not_found", "요청을 찾을 수 없어요.");

    const request = unwrap(
      (await this.db
        .from("requests")
        .select()
        .eq("id", requestId)
        .eq("room_id", room.id)
        .maybeSingle()) as { data: RequestRow | null; error: PostgrestError | null },
    );
    if (!request) throw new DomainError("not_found", "요청을 찾을 수 없어요.");

    if (actor.kind === "participant" && request.sender_id !== actor.participant.id) {
      throw new DomainError("forbidden", "내 요청만 취소할 수 있어요.");
    }
    if (actor.kind === "receiver" && request.target_id !== actor.receiver.id) {
      throw new DomainError("forbidden", "다른 수신자의 요청이에요.");
    }
    if (request.status === status) return toRequest(request);
    if (!canTransition(actor.kind, request.status, status)) {
      throw new DomainError("invalid_transition", "지금은 바꿀 수 없는 상태예요.");
    }

    // Compare-and-set on the previous status so concurrent updates can't skip rules.
    const updated = unwrap(
      (await this.db
        .from("requests")
        .update({ status })
        .eq("id", requestId)
        .eq("status", request.status)
        .select()
        .maybeSingle()) as { data: RequestRow | null; error: PostgrestError | null },
    );
    if (!updated) {
      throw new DomainError("invalid_transition", "지금은 바꿀 수 없는 상태예요.");
    }
    return toRequest(updated);
  }

  subscribe(code: string, listener: () => void): () => void {
    let cancelled = false;
    let release: (() => void) | undefined;

    void this.requireRoom(code)
      .then((room) => {
        if (cancelled) return;
        release = this.attach(room.id, listener);
      })
      .catch((error) => console.error("realtime subscribe failed", error));

    return () => {
      cancelled = true;
      release?.();
    };
  }

  private attach(roomId: string, listener: () => void): () => void {
    let shared = this.channels.get(roomId);
    if (!shared) {
      const listeners = new Set<() => void>();
      const emit = () => {
        for (const l of listeners) {
          try {
            l();
          } catch (error) {
            console.error("room listener failed", error);
          }
        }
      };
      const channel = this.db.channel(`pingque-room-${roomId}`);
      for (const table of ["requests", "participants"]) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `room_id=eq.${roomId}` },
          emit,
        );
      }
      channel.subscribe();
      shared = { channel, listeners };
      this.channels.set(roomId, shared);
    }
    shared.listeners.add(listener);
    const current = shared;
    return () => {
      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        this.channels.delete(roomId);
        void this.db.removeChannel(current.channel);
      }
    };
  }

  private async requireRoom(code: string): Promise<RoomRow> {
    const room = unwrap(
      (await this.db
        .from("rooms")
        .select()
        .eq("code", normalizeJoinCode(code))
        .maybeSingle()) as { data: RoomRow | null; error: PostgrestError | null },
    );
    if (!room) throw new DomainError("not_found", "방을 찾을 수 없어요.");
    return room;
  }

  private async requireActiveRoom(code: string): Promise<RoomRow> {
    const room = await this.requireRoom(code);
    if (isExpired({ expiresAt: ms(room.expires_at) }, Date.now())) {
      throw new DomainError("room_expired", "방이 종료되었어요.");
    }
    return room;
  }

  private async authenticate(room: RoomRow, token: string): Promise<Actor> {
    if (!token) throw new DomainError("unauthorized", "인증이 필요해요.");
    const hash = hashToken(token);
    const receiver = unwrap(
      (await this.db
        .from("room_receivers")
        .select()
        .eq("room_id", room.id)
        .eq("token_hash", hash)
        .maybeSingle()) as { data: ReceiverRow | null; error: PostgrestError | null },
    );
    if (receiver) return { kind: "receiver", receiver };
    const participant = unwrap(
      (await this.db
        .from("participants")
        .select()
        .eq("room_id", room.id)
        .eq("token_hash", hash)
        .maybeSingle()) as { data: ParticipantRow | null; error: PostgrestError | null },
    );
    if (participant) return { kind: "participant", participant };
    throw new DomainError("unauthorized", "인증이 필요해요.");
  }
}
