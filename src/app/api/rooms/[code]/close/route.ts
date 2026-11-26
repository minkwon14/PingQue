import { bearerToken, errorResponse, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function POST(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    await getStore().closeRoom(code, bearerToken(request));
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
