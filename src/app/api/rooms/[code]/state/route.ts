import { connectedCount, touchPresence } from "@/lib/server/presence";
import { bearerToken, errorResponse, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function GET(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    const snapshot = await getStore().getSnapshot(code, bearerToken(request));
    if (snapshot.viewer.kind === "participant") {
      touchPresence(code, snapshot.viewer.participant.id);
    }
    return Response.json(
      { ...snapshot, connectedCount: connectedCount(code) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
