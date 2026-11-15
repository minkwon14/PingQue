import { HostRoom } from "@/components/HostRoom";
import { normalizeJoinCode } from "@/lib/domain/rules";

export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HostRoom code={normalizeJoinCode(code)} />;
}
