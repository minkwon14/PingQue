import { DomainError } from "@/lib/domain/errors";

export function errorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    return Response.json(
      { error: error.code, message: error.message, retryAfterMs: error.retryAfterMs },
      { status: error.status },
    );
  }
  console.error(error);
  return Response.json(
    { error: "internal", message: "서버 오류가 발생했어요." },
    { status: 500 },
  );
}

export function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // fall through to the invalid_input error below
  }
  throw new DomainError("invalid_input", "요청 본문이 올바르지 않아요.");
}

export type CodeContext = { params: Promise<{ code: string }> };
export type RequestContext = { params: Promise<{ code: string; id: string }> };
