import { describe, expect, it } from "vitest";
import { PRESENCE_TTL_MS } from "@/lib/config";
import { connectedCount, touchPresence } from "./presence";

describe("presence", () => {
  it("counts participants seen within the TTL and drops stale ones", () => {
    const code = "PRESNC";
    touchPresence(code, "a", 1000);
    touchPresence(code, "b", 1000 + PRESENCE_TTL_MS - 1);
    expect(connectedCount(code, 1000 + PRESENCE_TTL_MS - 1)).toBe(2);
    expect(connectedCount(code, 1000 + PRESENCE_TTL_MS + 1)).toBe(1);
    expect(connectedCount(code, 1000 + 2 * PRESENCE_TTL_MS)).toBe(0);
  });

  it("is case-insensitive on the join code", () => {
    touchPresence("abc234", "a", 5);
    expect(connectedCount("ABC234", 5)).toBe(1);
  });
});
