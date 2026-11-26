import { describe, expect, it } from "vitest";
import { ANNOUNCEMENT_MAX_LENGTH, MAX_ANNOUNCEMENT_PRESETS, MAX_ROLES, ROLE_MAX_LENGTH } from "@/lib/config";
import { DomainError } from "./errors";
import {
  canTransition,
  generateJoinCode,
  isExpired,
  normalizeJoinCode,
  rateLimitRetryAfter,
  resolveSelections,
  validateAnnouncementPresets,
  validateParticipantInput,
  validateRoles,
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
  it("trims the name and accepts any role text of valid length", () => {
    expect(validateParticipantInput({ name: "  민  ", role: "  건반 " })).toEqual({
      name: "민",
      role: "건반",
    });
    expect(validateParticipantInput({ name: "민", role: "스태프" }).role).toBe("스태프");
    expect(() => validateParticipantInput({ name: "", role: "건반" })).toThrow(DomainError);
    expect(() => validateParticipantInput({ name: "a".repeat(21), role: "건반" })).toThrow(DomainError);
  });

  it("rejects empty, non-string and too long roles", () => {
    for (const role of ["", "   ", 5, null, "가".repeat(ROLE_MAX_LENGTH + 1)]) {
      expect(() => validateParticipantInput({ name: "민", role })).toThrow(DomainError);
    }
  });
});

describe("validateAnnouncementPresets", () => {
  it("trims, keeps order, drops duplicates and allows an empty list", () => {
    expect(validateAnnouncementPresets(["  하나 ", "둘", "하나"])).toEqual(["하나", "둘"]);
    expect(validateAnnouncementPresets([])).toEqual([]);
  });

  it("enforces the count and per-item length limits", () => {
    const many = Array.from({ length: MAX_ANNOUNCEMENT_PRESETS + 1 }, (_, i) => `문구 ${i}`);
    expect(() => validateAnnouncementPresets(many)).toThrow(DomainError);
    expect(validateAnnouncementPresets(many.slice(0, MAX_ANNOUNCEMENT_PRESETS))).toHaveLength(
      MAX_ANNOUNCEMENT_PRESETS,
    );
    expect(() => validateAnnouncementPresets(["가".repeat(ANNOUNCEMENT_MAX_LENGTH + 1)])).toThrow(DomainError);
    expect(validateAnnouncementPresets(["가".repeat(ANNOUNCEMENT_MAX_LENGTH)])).toHaveLength(1);
    for (const bad of ["x", null, {}, [""], ["  "], [5]]) {
      expect(() => validateAnnouncementPresets(bad)).toThrow(DomainError);
    }
  });
});

describe("validateRoles", () => {
  it("trims, drops duplicates and enforces limits", () => {
    expect(validateRoles([" 보컬 ", "드럼", "보컬"])).toEqual(["보컬", "드럼"]);
    expect(validateRoles([])).toEqual([]);
    expect(() =>
      validateRoles(Array.from({ length: MAX_ROLES + 1 }, (_, i) => `역할 ${i}`)),
    ).toThrow(DomainError);
    expect(() => validateRoles(["가".repeat(ROLE_MAX_LENGTH + 1)])).toThrow(DomainError);
    expect(() => validateRoles("보컬")).toThrow(DomainError);
  });
});
