import { bearerToken, errorResponse, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function GET(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    const snapshot = await getStore().getSnapshot(code, bearerToken(request));
    return Response.json(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
