import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export { randomInt, randomUUID };
