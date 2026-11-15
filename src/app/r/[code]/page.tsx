import { ParticipantRoom } from "@/components/ParticipantRoom";
import { normalizeJoinCode } from "@/lib/domain/rules";

export default async function ParticipantPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <ParticipantRoom code={normalizeJoinCode(code)} />;
}
