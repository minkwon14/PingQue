import { bearerToken, errorResponse, readJson, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function POST(request: Request, { params }: CodeContext) {
  try {
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
