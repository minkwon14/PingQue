import { bearerToken, errorResponse, readJson, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function PUT(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    const body = await readJson(request);
    const buttons = await getStore().setButtons(code, bearerToken(request), body.buttons);
    return Response.json({ buttons });
  } catch (error) {
    return errorResponse(error);
  }
}
