import { HostRoom } from "@/components/HostRoom";
import { normalizeJoinCode } from "@/lib/domain/rules";
import { getPublicOrigin } from "@/lib/server/origin";

export default async function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <HostRoom code={normalizeJoinCode(code)} publicOrigin={getPublicOrigin(process.env)} />;
}
