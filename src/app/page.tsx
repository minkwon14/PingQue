"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { primaryButton, secondaryButton } from "@/components/ui";
import { TEMPLATES } from "@/lib/domain/templates";
import { normalizeJoinCode } from "@/lib/domain/rules";
import { api } from "@/lib/client/api";
import { loadHostButtons } from "@/lib/client/buttons";
import { loadHostPresets, loadHostRoles } from "@/lib/client/hostLists";
import { hostKey, writeStored } from "@/lib/client/storage";
import { ROOM_TTL_MINUTES } from "@/lib/config";

const ROOM_TTL_LABEL =
  ROOM_TTL_MINUTES % 60 === 0 ? `${ROOM_TTL_MINUTES / 60}시간` : `${ROOM_TTL_MINUTES}분`;

export default function Home() {
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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 p-6 pt-12">
      <header>
        <h1 className="text-4xl font-black tracking-tight">TapCue</h1>
        <p className="mt-2 text-lg text-zinc-400">터치 한 번으로 보내는 현장 실시간 신호</p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">방 만들기 (호스트)</h2>
        <div className="flex flex-col gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              aria-pressed={templateId === t.id}
              className={`rounded-2xl border-2 p-4 text-left ${
                templateId === t.id
                  ? "border-indigo-400 bg-indigo-500/15"
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              <div className="text-lg font-bold">{t.name}</div>
              <div className="text-sm text-zinc-400">{t.description}</div>
            </button>
          ))}
        </div>
        <button type="button" className={primaryButton} onClick={createRoom} disabled={creating}>
          {creating ? "만드는 중…" : "방 만들기"}
        </button>
        <p className="text-sm text-zinc-500">
          방은 {ROOM_TTL_LABEL} 뒤에 자동으로 종료돼요. 가입은 필요 없어요.
        </p>
        {error ? <p className="text-red-400">{error}</p> : null}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">코드로 참여하기</h2>
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
            className="min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-zinc-800 bg-zinc-900 px-4 text-center text-2xl font-bold tracking-widest uppercase placeholder:text-base placeholder:font-normal placeholder:tracking-normal"
          />
          <button type="submit" className={secondaryButton} disabled={!normalized}>
            참여
          </button>
        </form>
        <p className="text-sm text-zinc-500">
          QR 코드나 링크로 받았다면 그대로 열면 돼요.
        </p>
      </section>
    </main>
  );
}
