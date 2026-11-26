import { beforeEach, describe, expect, it } from "vitest";
import { JOIN_ATTEMPT_LIMIT, JOIN_ATTEMPT_WINDOW_MS } from "@/lib/config";
import { checkJoinAttempt, clientIp, resetJoinAttempts } from "./joinLimiter";
import { getPublicOrigin } from "./origin";

beforeEach(() => resetJoinAttempts());

describe("join attempt limiter", () => {
  it("allows up to the limit then returns a Korean rate_limited error", () => {
    for (let i = 0; i < JOIN_ATTEMPT_LIMIT; i++) checkJoinAttempt("1.2.3.4", 0);
    expect(() => checkJoinAttempt("1.2.3.4", 1000)).toThrowError(/참여 시도가 너무 많아요/);
    try {
      checkJoinAttempt("1.2.3.4", 1000);
    } catch (e) {
      expect(e).toMatchObject({ code: "rate_limited", status: 429 });
    }
  });
  it("tracks IPs separately and resets after the window", () => {
    for (let i = 0; i < JOIN_ATTEMPT_LIMIT; i++) checkJoinAttempt("1.2.3.4", 0);
    expect(() => checkJoinAttempt("5.6.7.8", 0)).not.toThrow();
    expect(() => checkJoinAttempt("1.2.3.4", JOIN_ATTEMPT_WINDOW_MS)).not.toThrow();
  });
  it("reads the client IP from proxy headers", () => {
    const req = (h: Record<string, string>) => new Request("http://x", { headers: h });
    expect(clientIp(req({ "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))).toBe("9.9.9.9");
    expect(clientIp(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientIp(req({}))).toBe("unknown");
  });
});

describe("getPublicOrigin", () => {
  it("normalizes a valid origin and ignores unset or invalid values", () => {
    expect(getPublicOrigin({ PUBLIC_ORIGIN: " https://pq.example.com/some/path " })).toBe("https://pq.example.com");
    expect(getPublicOrigin({})).toBeUndefined();
    expect(getPublicOrigin({ PUBLIC_ORIGIN: "not a url" })).toBeUndefined();
    expect(getPublicOrigin({ PUBLIC_ORIGIN: "ftp://x.com" })).toBeUndefined();
  });
});
