import { DomainError } from "@/lib/domain/errors";
import { isRequestStatus } from "@/lib/domain/rules";
import {
  bearerToken,
  errorResponse,
  readJson,
  type RequestContext,
} from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function PATCH(request: Request, { params }: RequestContext) {
  try {
    const { code, id } = await params;
    const body = await readJson(request);
    if (!isRequestStatus(body.status)) {
      throw new DomainError("invalid_input", "올바르지 않은 상태예요.");
    }
    const updated = await getStore().updateRequestStatus(
      code,
      bearerToken(request),
      id,
      body.status,
    );
    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
