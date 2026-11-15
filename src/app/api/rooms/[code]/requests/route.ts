import { bearerToken, errorResponse, readJson, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function POST(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    const body = await readJson(request);
    const result = await getStore().createRequest(code, bearerToken(request), {
      id: body.id,
      selections: body.selections,
    });
    return Response.json(result.request, { status: result.created ? 201 : 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
