import { bearerToken, errorResponse, readJson, type CodeContext } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function PUT(request: Request, { params }: CodeContext) {
  try {
    const { code } = await params;
    const body = await readJson(request);
    const presets = await getStore().setAnnouncementPresets(code, bearerToken(request), body.presets);
    return Response.json({ presets });
  } catch (error) {
    return errorResponse(error);
  }
}
