import { errorResponse, type CodeContext } from "@/lib/server/http";
import { checkJoinAttempt, clientIp } from "@/lib/server/joinLimiter";
import { getStore } from "@/lib/store";

export async function GET(request: Request, { params }: CodeContext) {
  try {
    checkJoinAttempt(clientIp(request));
    const { code } = await params;
    return Response.json(await getStore().getPublicRoom(code));
  } catch (error) {
    return errorResponse(error);
  }
}
