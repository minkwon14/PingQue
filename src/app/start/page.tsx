"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fieldBase, Lamp, primaryButton, secondaryButton } from "@/components/ui";
import { TEMPLATES } from "@/lib/domain/templates";
import { normalizeJoinCode } from "@/lib/domain/rules";
import { api } from "@/lib/client/api";
import { loadHostButtons } from "@/lib/client/buttons";
import { loadHostPresets, loadHostRoles } from "@/lib/client/hostLists";
import { hostKey, writeStored } from "@/lib/client/storage";
import { ROOM_TTL_MINUTES } from "@/lib/config";

const ROOM_TTL_LABEL =
  ROOM_TTL_MINUTES % 60 === 0 ? `${ROOM_TTL_MINUTES / 60}시간` : `${ROOM_TTL_MINUTES}분`;

export default function StartPage() {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function createRoom() {
    setCreating(true);
    setError(null);
    try {
      const { room, hostToken } = await api.createRoom(templateId, {
        buttons: loadHostButtons(),
        announcementPresets: loadHostPresets(),
        roles: loadHostRoles(templateId),
      });
      writeStored(hostKey(room.code), hostToken);
      router.push(`/host/${room.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "방을 만들지 못했어요.");
      setCreating(false);
    }
  }

  const normalized = normalizeJoinCode(code);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-12 px-5 pb-14 pt-10 sm:pt-16">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          <Link href="/" className="inline-flex items-center gap-3">
            <span aria-hidden className="flex items-center gap-1.5">
              <Lamp tone="amber" className="size-3.5" />
              <Lamp tone="blue" className="size-3.5" />
              <Lamp tone="green" className="size-3.5" />
            </span>
            TapCue
          </Link>
        </h1>
        <p className="text-lg text-tc-muted">터치 한 번으로 보내는 현장 실시간 신호</p>
      </header>

      <section id="create" className="flex scroll-mt-6 flex-col gap-4">
        <h2 className="font-display text-2xl font-bold">방 만들기 (호스트)</h2>
        <div className="flex flex-col gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              aria-pressed={templateId === t.id}
              className={`flex min-h-20 flex-col justify-center rounded-2xl border-2 px-5 py-3 text-left transition-colors ${
                templateId === t.id
                  ? "border-tc-amber bg-tc-amber/10"
                  : "border-tc-line bg-tc-deck hover:bg-tc-raised"
              }`}
            >
              <div className="text-xl font-semibold">{t.name}</div>
              <div className="text-base text-tc-muted">{t.description}</div>
            </button>
          ))}
        </div>
        <button type="button" className={primaryButton} onClick={createRoom} disabled={creating}>
          {creating ? "만드는 중…" : "방 만들기"}
        </button>
        <p className="text-base text-tc-muted">
          방은 {ROOM_TTL_LABEL} 뒤에 자동으로 종료돼요. 가입은 필요 없어요.
        </p>
        {error ? <p className="font-medium text-tc-red">{error}</p> : null}
      </section>

      <section id="join" className="flex scroll-mt-6 flex-col gap-4 border-t border-tc-line pt-10">
        <h2 className="font-display text-2xl font-bold">코드로 참여하기</h2>
        <form
          className="flex gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (normalized) router.push(`/join/${normalized}`);
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="참여 코드"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            inputMode="text"
            maxLength={12}
            className={`${fieldBase} min-h-14 min-w-0 flex-1 bg-tc-deck text-center font-mono text-2xl font-semibold tracking-widest uppercase placeholder:font-sans placeholder:text-base placeholder:tracking-normal`}
          />
          <button type="submit" className={secondaryButton} disabled={!normalized}>
            참여
          </button>
        </form>
        <p className="text-base text-tc-muted">
          QR 코드나 링크로 받았다면 그대로 열면 돼요.
        </p>
      </section>
    </main>
  );
}
