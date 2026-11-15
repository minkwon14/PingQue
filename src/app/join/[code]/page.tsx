import { JoinForm } from "@/components/JoinForm";
import { normalizeJoinCode } from "@/lib/domain/rules";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinForm code={normalizeJoinCode(code)} />;
}
