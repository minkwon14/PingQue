import { errorResponse, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function GET(_request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    return Response.json(await getStore().getPublicRoom(code));
  } catch (error) {
    return errorResponse(error);
  }
}
