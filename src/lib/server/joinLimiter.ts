import { JOIN_ATTEMPT_LIMIT, JOIN_ATTEMPT_WINDOW_MS } from "@/lib/config";
import { DomainError } from "@/lib/domain/errors";

type Bucket = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as { __pingqueJoinBuckets?: Map<string, Bucket> };

/** In-memory (per server process); shared across route handlers and dev reloads. */
function buckets(): Map<string, Bucket> {
  globalForLimiter.__pingqueJoinBuckets ??= new Map();
  return globalForLimiter.__pingqueJoinBuckets;
}

/**
 * Client IP as reported by the proxy in front of the app (Cloudflare Tunnel,
 * Render). These headers are only trustworthy behind such a proxy.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    forwarded ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function checkJoinAttempt(ip: string, now: number = Date.now()): void {
  const map = buckets();
  if (map.size > 1000) {
    for (const [key, bucket] of map) if (bucket.resetAt <= now) map.delete(key);
  }
  let bucket = map.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + JOIN_ATTEMPT_WINDOW_MS };
    map.set(ip, bucket);
  }
  bucket.count += 1;
  if (bucket.count > JOIN_ATTEMPT_LIMIT) {
    const retryAfterMs = bucket.resetAt - now;
    throw new DomainError(
      "rate_limited",
      `참여 시도가 너무 많아요. ${Math.ceil(retryAfterMs / 1000)}초 뒤에 다시 시도해 주세요.`,
      retryAfterMs,
    );
  }
}

export function resetJoinAttempts(): void {
  buckets().clear();
}
