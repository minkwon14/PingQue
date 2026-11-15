export type DomainErrorCode =
  | "invalid_input"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "room_expired"
  | "room_full"
  | "id_conflict"
  | "invalid_transition"
  | "rate_limited";

const STATUS: Record<DomainErrorCode, number> = {
  invalid_input: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  room_expired: 410,
  room_full: 409,
  id_conflict: 409,
  invalid_transition: 409,
  rate_limited: 429,
};

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(code: DomainErrorCode, message?: string, retryAfterMs?: number) {
    super(message ?? code);
    this.name = "DomainError";
    this.code = code;
    this.status = STATUS[code];
    this.retryAfterMs = retryAfterMs;
  }
}
