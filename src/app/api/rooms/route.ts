import { DomainError } from "@/lib/domain/errors";
import { errorResponse, readJson } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    if (typeof body.templateId !== "string") {
      throw new DomainError("invalid_input", "템플릿을 선택해 주세요.");
    }
    const { room, hostToken } = await getStore().createRoom({
      templateId: body.templateId,
      buttons: body.buttons,
      announcementPresets: body.announcementPresets,
      roles: body.roles,
    });
    return Response.json({ room, hostToken }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
