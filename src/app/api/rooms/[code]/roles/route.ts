import { bearerToken, errorResponse, readJson, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function PUT(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    const body = await readJson(request);
    const roles = await getStore().setRoles(code, bearerToken(request), body.roles);
    return Response.json({ roles });
  } catch (error) {
    return errorResponse(error);
  }
}
