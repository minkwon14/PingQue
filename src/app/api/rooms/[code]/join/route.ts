import { bearerToken, errorResponse, readJson, type CodeContext } from "@/lib/server/http";
import { checkJoinAttempt, clientIp } from "@/lib/server/joinLimiter";
import { getStore } from "@/lib/store";

export async function POST(request: Request, { params }: CodeContext) {
  try {
    checkJoinAttempt(clientIp(request));
    const { code } = await params;
    const body = await readJson(request);
    const token = bearerToken(request) || undefined;
    const result = await getStore().joinRoom(code, {
      name: body.name,
      role: body.role,
      token,
    });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
