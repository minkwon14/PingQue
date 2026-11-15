import type {
  PingRequest,
  PublicRoom,
  RequestStatus,
  Room,
  RoomSnapshot,
  Participant,
} from "@/lib/domain/types";

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfterMs?: number;

  constructor(code: string, status: number, message: string, retryAfterMs?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }

  get isFatal(): boolean {
    return [401, 403, 404, 410].includes(this.status);
  }
}

async function call<T>(
  path: string,
  options: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      cache: "no-store",
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("network", 0, "서버에 연결할 수 없어요.");
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = (data ?? {}) as { error?: string; message?: string; retryAfterMs?: number };
    throw new ApiError(
      err.error ?? "unknown",
      response.status,
      err.message ?? "요청에 실패했어요.",
      err.retryAfterMs,
    );
  }
  return data as T;
}

const room = (code: string) => `/api/rooms/${encodeURIComponent(code)}`;

export const api = {
  createRoom: (templateId: string) =>
    call<{ room: Room; hostToken: string }>("/api/rooms", {
      method: "POST",
      body: { templateId },
    }),
  getPublicRoom: (code: string) => call<PublicRoom>(room(code)),
  join: (code: string, input: { name: string; role: string }, token?: string | null) =>
    call<{ room: Room; participant: Participant; token: string }>(`${room(code)}/join`, {
      method: "POST",
      token,
      body: input,
    }),
  getState: (code: string, token: string) =>
    call<RoomSnapshot>(`${room(code)}/state`, { token }),
  sendRequest: (code: string, token: string, input: { id: string; selections: string[] }) =>
    call<PingRequest>(`${room(code)}/requests`, { method: "POST", token, body: input }),
  setStatus: (code: string, token: string, id: string, status: RequestStatus) =>
    call<PingRequest>(`${room(code)}/requests/${id}`, {
      method: "PATCH",
      token,
      body: { status },
    }),
};
