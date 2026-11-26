import { bearerToken, errorResponse, readJson, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function POST(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    const body = await readJson(request);
    const announcement = await getStore().announce(code, bearerToken(request), body.text);
    return Response.json(announcement, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
