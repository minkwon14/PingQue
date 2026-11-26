import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError, type DomainErrorCode } from "@/lib/domain/errors";
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
