import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError, type DomainErrorCode } from "@/lib/domain/errors";
import {
  ANNOUNCEMENT_HISTORY_SIZE,
  ANNOUNCEMENT_MAX_LENGTH,
  ANNOUNCEMENT_RATE_LIMIT_MS,
  CUSTOM_BUTTON_LABEL_MAX_LENGTH,
  MAX_CUSTOM_BUTTONS,
  NAME_MAX_LENGTH,
} from "@/lib/config";
import { MemoryRoomStore } from "./memory";

const SELECTION = ["keyboard", "my-monitor", "louder"];
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";

async function expectCode(promise: Promise<unknown>, code: DomainErrorCode) {
  await expect(promise).rejects.toMatchObject({ code });
  await expect(promise).rejects.toBeInstanceOf(DomainError);
}

let clock: number;
let store: MemoryRoomStore;

beforeEach(() => {
  clock = 1_000_000;
  store = new MemoryRoomStore({ now: () => clock, roomTtlMs: 30 * 60 * 1000 });
});

async function setup() {
  const { room, hostToken } = await store.createRoom({ templateId: "worship" });
  const { token } = await store.joinRoom(room.code, { name: "민", role: "건반" });
  return { room, hostToken, token };
}

describe("rooms and joining", () => {
  it("creates a room that expires after the configured lifetime", async () => {
    const { room } = await store.createRoom({ templateId: "worship" });
    expect(room.expiresAt - room.createdAt).toBe(30 * 60 * 1000);
    expect(room.code).toHaveLength(8);
    await expect(store.getPublicRoom(room.code.toLowerCase())).resolves.toMatchObject({
      participantCount: 0,
    });
    clock = room.expiresAt;
    await expectCode(store.getPublicRoom(room.code), "room_expired");
  });

  it("rejects unknown templates and unknown rooms", async () => {
    await expectCode(store.createRoom({ templateId: "nope" }), "invalid_input");
    await expectCode(store.getPublicRoom("ZZZZZZ"), "not_found");
  });

  it("caps participants at the configured maximum", async () => {
    const small = new MemoryRoomStore({ now: () => clock, maxParticipants: 2 });
    const { room } = await small.createRoom({ templateId: "worship" });
    await small.joinRoom(room.code, { name: "a", role: "건반" });
    await small.joinRoom(room.code, { name: "b", role: "건반" });
    await expectCode(small.joinRoom(room.code, { name: "c", role: "건반" }), "room_full");
  });

  it("defaults to 10 participants and re-attaches a known device without using a seat", async () => {
    const { room } = await store.createRoom({ templateId: "worship" });
    const first = await store.joinRoom(room.code, { name: "p0", role: "건반" });
    for (let i = 1; i < 10; i++) {
      await store.joinRoom(room.code, { name: `p${i}`, role: "건반" });
    }
    await expectCode(store.joinRoom(room.code, { name: "late", role: "건반" }), "room_full");

    const again = await store.joinRoom(room.code, {
      name: "p0 renamed",
      role: "드럼",
      token: first.token,
    });
    expect(again.participant.id).toBe(first.participant.id);
    expect(again.participant.name).toBe("p0 renamed");
    expect((await store.getPublicRoom(room.code)).participantCount).toBe(10);
  });
});

describe("snapshots and access", () => {
  it("requires a valid token", async () => {
    const { room } = await setup();
    await expectCode(store.getSnapshot(room.code, ""), "unauthorized");
    await expectCode(store.getSnapshot(room.code, "bogus"), "unauthorized");
  });

  it("shows receivers everything and participants only their own requests", async () => {
    const { room, hostToken, token } = await setup();
    const other = await store.joinRoom(room.code, { name: "다른 사람", role: "드럼" });
    await store.createRequest(room.code, token, { id: ID_A, selections: SELECTION });
    await store.createRequest(room.code, other.token, { id: ID_B, selections: SELECTION });

    const host = await store.getSnapshot(room.code, hostToken);
    expect(host.viewer.kind).toBe("receiver");
    expect(host.requests).toHaveLength(2);
    expect(host.participants).toHaveLength(2);

    const mine = await store.getSnapshot(room.code, token);
    expect(mine.viewer.kind).toBe("participant");
    expect(mine.requests.map((r) => r.id)).toEqual([ID_A]);
    expect(mine.participantCount).toBe(2);
  });
});

describe("createRequest", () => {
  it("stores a structured request that starts as received", async () => {
    const { room, token } = await setup();
    const { request, created } = await store.createRequest(room.code, token, {
      id: ID_A,
      selections: SELECTION,
    });
    expect(created).toBe(true);
    expect(request).toMatchObject({
      id: ID_A,
      status: "received",
      item: "키보드",
      qualifiers: ["내 모니터"],
      action: "더 크게 ↑",
      label: "키보드 · 내 모니터 · 더 크게 ↑",
      createdAt: clock,
    });
  });

  it("is idempotent: replaying the same id returns the stored request, even after the rate window", async () => {
    const { room, hostToken, token } = await setup();
    const first = await store.createRequest(room.code, token, { id: ID_A, selections: SELECTION });
    const replayNow = await store.createRequest(room.code, token, { id: ID_A, selections: SELECTION });
    clock += 5000;
    const replayLater = await store.createRequest(room.code, token, {
      id: ID_A,
      selections: ["bass", "in-ear", "mute"],
    });
    expect(replayNow.created).toBe(false);
    expect(replayLater.created).toBe(false);
    expect(replayLater.request).toEqual(first.request);
    expect((await store.getSnapshot(room.code, hostToken)).requests).toHaveLength(1);
  });

  it("does not let another participant reuse a request id", async () => {
    const { room, token } = await setup();
    const other = await store.joinRoom(room.code, { name: "b", role: "드럼" });
    await store.createRequest(room.code, token, { id: ID_A, selections: SELECTION });
    await expectCode(
      store.createRequest(room.code, other.token, { id: ID_A, selections: SELECTION }),
      "id_conflict",
    );
  });

  it("treats intentional repeats with a new id as distinct requests", async () => {
    const { room, hostToken, token } = await setup();
    await store.createRequest(room.code, token, { id: ID_A, selections: SELECTION });
    clock += 1000;
    await store.createRequest(room.code, token, { id: ID_B, selections: SELECTION });
    expect((await store.getSnapshot(room.code, hostToken)).requests).toHaveLength(2);
  });

  it("rate limits new requests per device to one per second", async () => {
    const { room, token } = await setup();
    const other = await store.joinRoom(room.code, { name: "b", role: "드럼" });
    await store.createRequest(room.code, token, { id: ID_A, selections: SELECTION });
    clock += 400;
    const limited = store.createRequest(room.code, token, { id: ID_B, selections: SELECTION });
    await expectCode(limited, "rate_limited");
    await expect(limited).rejects.toMatchObject({ retryAfterMs: 600 });
    await expect(
      store.createRequest(room.code, other.token, { id: ID_C, selections: SELECTION }),
    ).resolves.toMatchObject({ created: true });
    clock += 600;
    await expect(
      store.createRequest(room.code, token, { id: ID_B, selections: SELECTION }),
    ).resolves.toMatchObject({ created: true });
  });

  it("validates ids, selections, role and expiry", async () => {
    const { room, hostToken, token } = await setup();
    await expectCode(
      store.createRequest(room.code, token, { id: "not-a-uuid", selections: SELECTION }),
      "invalid_input",
    );
    await expectCode(
      store.createRequest(room.code, token, { id: ID_A, selections: ["keyboard"] }),
      "invalid_input",
    );
    await expectCode(
      store.createRequest(room.code, hostToken, { id: ID_A, selections: SELECTION }),
      "forbidden",
    );
    clock = room.expiresAt;
    await expectCode(
      store.createRequest(room.code, token, { id: ID_A, selections: SELECTION }),
      "room_expired",
    );
  });
});

describe("updateRequestStatus", () => {
  async function withRequest() {
    const ctx = await setup();
    await store.createRequest(ctx.room.code, ctx.token, { id: ID_A, selections: SELECTION });
    return ctx;
  }

  it("lets the host confirm then finish, recording timestamps", async () => {
    const { room, hostToken } = await withRequest();
    clock += 1000;
    const confirmed = await store.updateRequestStatus(room.code, hostToken, ID_A, "confirmed");
    expect(confirmed).toMatchObject({ status: "confirmed", confirmedAt: clock });
    clock += 1000;
    const done = await store.updateRequestStatus(room.code, hostToken, ID_A, "done");
    expect(done).toMatchObject({ status: "done", doneAt: clock });
  });

  it("is idempotent when the same status is sent again", async () => {
    const { room, hostToken } = await withRequest();
    await store.updateRequestStatus(room.code, hostToken, ID_A, "confirmed");
    clock += 1000;
    const again = await store.updateRequestStatus(room.code, hostToken, ID_A, "confirmed");
    expect(again.confirmedAt).toBe(1_000_000);
  });

  it("lets participants cancel only their own active requests", async () => {
    const { room, hostToken, token } = await withRequest();
    const other = await store.joinRoom(room.code, { name: "b", role: "드럼" });
    await expectCode(
      store.updateRequestStatus(room.code, other.token, ID_A, "cancelled"),
      "forbidden",
    );
    await expectCode(
      store.updateRequestStatus(room.code, token, ID_A, "confirmed"),
      "invalid_transition",
    );
    await expectCode(
      store.updateRequestStatus(room.code, hostToken, ID_A, "cancelled"),
      "invalid_transition",
    );
    const cancelled = await store.updateRequestStatus(room.code, token, ID_A, "cancelled");
    expect(cancelled.status).toBe("cancelled");
    await expectCode(
      store.updateRequestStatus(room.code, hostToken, ID_A, "confirmed"),
      "invalid_transition",
    );
  });

  it("does not let a participant cancel after the host finished", async () => {
    const { room, hostToken, token } = await withRequest();
    await store.updateRequestStatus(room.code, hostToken, ID_A, "done");
    await expectCode(
      store.updateRequestStatus(room.code, token, ID_A, "cancelled"),
      "invalid_transition",
    );
  });

  it("returns not_found for unknown requests", async () => {
    const { room, hostToken } = await setup();
    await expectCode(
      store.updateRequestStatus(room.code, hostToken, ID_A, "confirmed"),
      "not_found",
    );
  });
});

describe("subscribe", () => {
  it("notifies listeners on changes until unsubscribed", async () => {
    const { room, hostToken, token } = await setup();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(room.code, listener);
    await store.createRequest(room.code, token, { id: ID_A, selections: SELECTION });
    await store.updateRequestStatus(room.code, hostToken, ID_A, "confirmed");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    await store.updateRequestStatus(room.code, hostToken, ID_A, "done");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

describe("custom buttons", () => {
  const B1 = { id: ID_A, label: "물 주세요" };
  const B2 = { id: ID_B, label: "  잠깐만요  " };

  it("lets only the host set buttons, applied to every viewer in order", async () => {
    const { room, hostToken, token } = await setup();
    await expectCode(store.setButtons(room.code, token, [B1]), "forbidden");
    await expectCode(store.setButtons(room.code, "", [B1]), "unauthorized");

    await expect(store.setButtons(room.code, hostToken, [B2, B1])).resolves.toEqual([
      { id: ID_B, label: "잠깐만요" },
      B1,
    ]);
    for (const t of [hostToken, token]) {
      const snapshot = await store.getSnapshot(room.code, t);
      expect(snapshot.room.buttons.map((b) => b.id)).toEqual([ID_B, ID_A]);
    }
  });

  it("rejects too many, duplicate, empty, or too long buttons", async () => {
    const { room, hostToken } = await setup();
    const many = Array.from({ length: MAX_CUSTOM_BUTTONS + 1 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      label: `b${i}`,
    }));
    await expectCode(store.setButtons(room.code, hostToken, many), "invalid_input");
    await expectCode(store.setButtons(room.code, hostToken, [B1, B1]), "invalid_input");
    await expectCode(store.setButtons(room.code, hostToken, [{ ...B1, label: " " }]), "invalid_input");
    await expectCode(
      store.setButtons(room.code, hostToken, [{ ...B1, label: "가".repeat(CUSTOM_BUTTON_LABEL_MAX_LENGTH + 1) }]),
      "invalid_input",
    );
    await expectCode(store.setButtons(room.code, hostToken, "nope"), "invalid_input");
  });

  it("preloads buttons when creating a room and validates them", async () => {
    const { room } = await store.createRoom({ templateId: "worship", buttons: [B1] });
    expect(room.buttons).toEqual([B1]);
    await expectCode(store.createRoom({ templateId: "worship", buttons: [{ id: "x", label: "a" }] }), "invalid_input");
    expect((await store.createRoom({ templateId: "worship" })).room.buttons).toEqual([]);
  });

  it("notifies subscribers when the host changes buttons", async () => {
    const { room, hostToken } = await setup();
    const listener = vi.fn();
    store.subscribe(room.code, listener);
    await store.setButtons(room.code, hostToken, [B1]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("sends a text request through the same path and limits", async () => {
    const { room, hostToken, token } = await setup();
    const { request, created } = await store.createRequest(room.code, token, {
      id: ID_A,
      text: " 물 주세요 ",
    });
    expect(created).toBe(true);
    expect(request).toMatchObject({ label: "물 주세요", item: "물 주세요", selections: [], action: "" });
    expect((await store.getSnapshot(room.code, hostToken)).requests).toHaveLength(1);

    await expect(
      store.createRequest(room.code, token, { id: ID_A, text: "물 주세요" }),
    ).resolves.toMatchObject({ created: false });
    await expectCode(store.createRequest(room.code, token, { id: ID_B, text: "또" }), "rate_limited");
    clock += 1000;
    await expectCode(store.createRequest(room.code, token, { id: ID_B, text: "  " }), "invalid_input");
    await expectCode(
      store.createRequest(room.code, token, { id: ID_B, text: "가".repeat(CUSTOM_BUTTON_LABEL_MAX_LENGTH + 1) }),
      "invalid_input",
    );
  });
});

describe("announcements", () => {
  it("is host-only, trimmed and validated", async () => {
    const { room, hostToken, token } = await setup();
    await expectCode(store.announce(room.code, token, "안녕"), "forbidden");
    await expectCode(store.announce(room.code, "", "안녕"), "unauthorized");
    await expectCode(store.announce(room.code, hostToken, "   "), "invalid_input");
    await expectCode(store.announce(room.code, hostToken, 5), "invalid_input");
    await expectCode(
      store.announce(room.code, hostToken, "가".repeat(ANNOUNCEMENT_MAX_LENGTH + 1)),
      "invalid_input",
    );
    const sent = await store.announce(room.code, hostToken, "  쉬는 시간  ");
    expect(sent).toMatchObject({ text: "쉬는 시간", createdAt: clock });
  });

  it("shows the latest first to host and participants and keeps a short history", async () => {
    const { room, hostToken, token } = await setup();
    for (let i = 0; i < ANNOUNCEMENT_HISTORY_SIZE + 2; i++) {
      await store.announce(room.code, hostToken, `공지 ${i}`);
      clock += ANNOUNCEMENT_RATE_LIMIT_MS;
    }
    const last = `공지 ${ANNOUNCEMENT_HISTORY_SIZE + 1}`;
    for (const t of [hostToken, token]) {
      const { announcements } = await store.getSnapshot(room.code, t);
      expect(announcements).toHaveLength(ANNOUNCEMENT_HISTORY_SIZE);
      expect(announcements[0].text).toBe(last);
    }
  });

  it("rate limits the host and notifies subscribers", async () => {
    const { room, hostToken } = await setup();
    const listener = vi.fn();
    store.subscribe(room.code, listener);
    await store.announce(room.code, hostToken, "하나");
    expect(listener).toHaveBeenCalledTimes(1);
    await expectCode(store.announce(room.code, hostToken, "둘"), "rate_limited");
    expect(listener).toHaveBeenCalledTimes(1);
    clock += ANNOUNCEMENT_RATE_LIMIT_MS;
    await expect(store.announce(room.code, hostToken, "둘")).resolves.toMatchObject({ text: "둘" });
  });
});

describe("closing the room", () => {
  it("is host-only and makes later joins, fetches and requests fail with room_closed", async () => {
    const { room, hostToken, token } = await setup();
    await expectCode(store.closeRoom(room.code, token), "forbidden");
    await expectCode(store.closeRoom(room.code, "bad"), "unauthorized");

    const notify = vi.fn();
    store.subscribe(room.code, notify);
    await store.closeRoom(room.code, hostToken);
    expect(notify).toHaveBeenCalled();

    await expectCode(store.joinRoom(room.code, { name: "x", role: "건반" }), "room_closed");
    await expectCode(store.joinRoom(room.code, { name: "x", role: "건반", token }), "room_closed");
    await expectCode(store.getPublicRoom(room.code), "room_closed");
    await expectCode(store.getSnapshot(room.code, token), "room_closed");
    await expectCode(store.getSnapshot(room.code, hostToken), "room_closed");
    await expectCode(store.createRequest(room.code, token, { id: ID_A, selections: SELECTION }), "room_closed");
  });
});

describe("leaving the room", () => {
  it("removes only the caller, cancels their active requests and keeps others intact", async () => {
    const { room, hostToken, token } = await setup();
    const other = await store.joinRoom(room.code, { name: "b", role: "드럼" });
    await store.createRequest(room.code, token, { id: ID_A, selections: SELECTION });
    await store.createRequest(room.code, other.token, { id: ID_B, selections: SELECTION });
    clock += 1000;
    await store.createRequest(room.code, token, { id: ID_C, selections: SELECTION });
    await store.updateRequestStatus(room.code, hostToken, ID_C, "done");

    const notify = vi.fn();
    store.subscribe(room.code, notify);
    const leaving = (await store.getSnapshot(room.code, token)).viewer;
    const { participantId } = await store.leaveRoom(room.code, token);
    expect(leaving).toMatchObject({ participant: { id: participantId } });
    expect(notify).toHaveBeenCalled();

    const snap = await store.getSnapshot(room.code, hostToken);
    expect(snap.participantCount).toBe(1);
    expect(snap.participants.map((p) => p.name)).toEqual(["b"]);
    const byId = new Map(snap.requests.map((r) => [r.id, r.status]));
    expect(byId.get(ID_A)).toBe("cancelled");
    expect(byId.get(ID_B)).toBe("received");
    expect(byId.get(ID_C)).toBe("done");
    await expect(store.getPublicRoom(room.code)).resolves.toMatchObject({ participantCount: 1 });
  });

  it("invalidates the device token, frees the slot and is participant-only", async () => {
    const small = new MemoryRoomStore({ now: () => clock, maxParticipants: 1 });
    const { room, hostToken } = await small.createRoom({ templateId: "worship" });
    const { token } = await small.joinRoom(room.code, { name: "a", role: "건반" });
    await expectCode(small.leaveRoom(room.code, hostToken), "forbidden");
    await expectCode(small.leaveRoom(room.code, "bad"), "unauthorized");
    await small.leaveRoom(room.code, token);
    await expectCode(small.getSnapshot(room.code, token), "unauthorized");
    await expectCode(small.leaveRoom(room.code, token), "unauthorized");
    await expect(small.joinRoom(room.code, { name: "b", role: "건반" })).resolves.toBeDefined();
  });
});

describe("editing own name and role", () => {
  it("updates the caller everywhere with the same validation as joining", async () => {
    const { room, hostToken, token } = await setup();
    const other = await store.joinRoom(room.code, { name: "b", role: "드럼" });
    await store.createRequest(room.code, token, { id: ID_A, selections: SELECTION });

    const notify = vi.fn();
    store.subscribe(room.code, notify);
    const updated = await store.updateProfile(room.code, token, { name: "  새이름 ", role: "드럼" });
    expect(updated).toMatchObject({ name: "새이름", role: "드럼" });
    expect(notify).toHaveBeenCalled();

    const mine = await store.getSnapshot(room.code, token);
    expect(mine.viewer).toMatchObject({ participant: { name: "새이름", role: "드럼" } });
    const host = await store.getSnapshot(room.code, hostToken);
    const sender = host.participants.find((p) => p.id === host.requests[0].senderId);
    expect(sender).toMatchObject({ name: "새이름", role: "드럼" });
    expect(host.participants.find((p) => p.name === "b")).toBeDefined();
    expect((await store.getSnapshot(room.code, other.token)).viewer).toMatchObject({
      participant: { name: "b", role: "드럼" },
    });
  });

  it("rejects invalid input, hosts and unknown tokens without changing anything", async () => {
    const { room, hostToken, token } = await setup();
    await expectCode(store.updateProfile(room.code, token, { name: " ", role: "건반" }), "invalid_input");
    await expectCode(
      store.updateProfile(room.code, token, { name: "a".repeat(NAME_MAX_LENGTH + 1), role: "건반" }),
      "invalid_input",
    );
    await expectCode(store.updateProfile(room.code, token, { name: "a", role: "없는역할" }), "invalid_input");
    await expectCode(store.updateProfile(room.code, hostToken, { name: "a", role: "건반" }), "forbidden");
    await expectCode(store.updateProfile(room.code, "bad", { name: "a", role: "건반" }), "unauthorized");
    expect((await store.getSnapshot(room.code, token)).viewer).toMatchObject({
      participant: { name: "민", role: "건반" },
    });
  });
});
