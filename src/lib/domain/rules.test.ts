import { describe, expect, it } from "vitest";
import { DomainError } from "./errors";
import {
  canTransition,
  generateJoinCode,
  isExpired,
  normalizeJoinCode,
  rateLimitRetryAfter,
  resolveSelections,
  validateParticipantInput,
} from "./rules";
import { TEMPLATES, getTemplate } from "./templates";

const worship = getTemplate("worship")!;

describe("templates", () => {
  it("every template has at least an item and an action step with unique option ids", () => {
    for (const t of TEMPLATES) {
      expect(t.steps.length).toBeGreaterThanOrEqual(2);
      expect(t.roles.length).toBeGreaterThan(0);
      for (const step of t.steps) {
        const ids = step.options.map((o) => o.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});

describe("resolveSelections", () => {
  it("builds a sequential label like '키보드 · 내 모니터 · 더 크게 ↑'", () => {
    const r = resolveSelections(worship, ["keyboard", "my-monitor", "louder"]);
    expect(r.label).toBe("키보드 · 내 모니터 · 더 크게 ↑");
    expect(r.item).toBe("키보드");
    expect(r.qualifiers).toEqual(["내 모니터"]);
    expect(r.action).toBe("더 크게 ↑");
  });

  it("rejects wrong length, unknown ids and non-arrays", () => {
    expect(() => resolveSelections(worship, ["keyboard"])).toThrow(DomainError);
    expect(() => resolveSelections(worship, ["keyboard", "x", "louder"])).toThrow(DomainError);
    expect(() => resolveSelections(worship, "keyboard")).toThrow(DomainError);
    expect(() => resolveSelections(worship, ["keyboard", "my-monitor", 3])).toThrow(DomainError);
  });
});

describe("canTransition", () => {
  it("lets the receiver confirm and finish, never cancel", () => {
    expect(canTransition("receiver", "received", "confirmed")).toBe(true);
    expect(canTransition("receiver", "received", "done")).toBe(true);
    expect(canTransition("receiver", "confirmed", "done")).toBe(true);
    expect(canTransition("receiver", "received", "cancelled")).toBe(false);
  });

  it("lets the participant cancel only active requests", () => {
    expect(canTransition("participant", "received", "cancelled")).toBe(true);
    expect(canTransition("participant", "confirmed", "cancelled")).toBe(true);
    expect(canTransition("participant", "done", "cancelled")).toBe(false);
    expect(canTransition("participant", "received", "confirmed")).toBe(false);
    expect(canTransition("participant", "received", "done")).toBe(false);
  });

  it("treats done and cancelled as terminal", () => {
    for (const actor of ["receiver", "participant"] as const) {
      for (const to of ["received", "confirmed", "done", "cancelled"] as const) {
        expect(canTransition(actor, "done", to)).toBe(false);
        expect(canTransition(actor, "cancelled", to)).toBe(false);
      }
    }
  });
});

describe("rateLimitRetryAfter", () => {
  it("allows the first request and requests after the interval", () => {
    expect(rateLimitRetryAfter(undefined, 1000, 1000)).toBe(0);
    expect(rateLimitRetryAfter(1000, 2000, 1000)).toBe(0);
  });
  it("returns the remaining wait inside the interval", () => {
    expect(rateLimitRetryAfter(1000, 1400, 1000)).toBe(600);
  });
});

describe("join codes and expiry", () => {
  it("generates codes from the unambiguous alphabet", () => {
    const code = generateJoinCode(() => 0);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]+$/);
  });
  it("normalizes user-typed codes", () => {
    expect(normalizeJoinCode(" ab-c 234 ")).toBe("ABC234");
  });
  it("expires exactly at expiresAt", () => {
    expect(isExpired({ expiresAt: 100 }, 99)).toBe(false);
    expect(isExpired({ expiresAt: 100 }, 100)).toBe(true);
  });
});

describe("validateParticipantInput", () => {
  it("trims the name and requires a role from the template", () => {
    expect(validateParticipantInput(worship, { name: "  민  ", role: "건반" })).toEqual({
      name: "민",
      role: "건반",
    });
    expect(() => validateParticipantInput(worship, { name: "", role: "건반" })).toThrow(DomainError);
    expect(() => validateParticipantInput(worship, { name: "민", role: "없는역할" })).toThrow(DomainError);
    expect(() => validateParticipantInput(worship, { name: "a".repeat(21), role: "건반" })).toThrow(DomainError);
  });
});
