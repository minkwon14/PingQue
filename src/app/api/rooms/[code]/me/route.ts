import { clearPresence } from "@/lib/server/presence";
import { bearerToken, errorResponse, readJson, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function PATCH(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    const body = await readJson(request);
    const participant = await getStore().updateProfile(code, bearerToken(request), {
      name: body.name,
      role: body.role,
    });
    return Response.json(participant);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    const { participantId } = await getStore().leaveRoom(code, bearerToken(request));
    clearPresence(code, participantId);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
