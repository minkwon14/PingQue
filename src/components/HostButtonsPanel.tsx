"use client";

import { useState } from "react";
import { ButtonListEditor } from "@/components/ButtonListEditor";
import { secondaryButton, primaryButton } from "@/components/ui";
import { actionErrorMessage, api } from "@/lib/client/api";
import { saveHostButtons } from "@/lib/client/buttons";
import { MAX_CUSTOM_BUTTONS } from "@/lib/config";
import type { RoomButton } from "@/lib/domain/types";

/** Host-only editor for the room's shared quick buttons. */
export function HostButtonsPanel({
  code,
  token,
  saved,
}: {
  code: string;
  token: string;
  saved: RoomButton[];
}) {
  const [draft, setDraft] = useState<RoomButton[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft) return;
    const cleaned = draft.map((b) => ({ ...b, label: b.label.trim() })).filter((b) => b.label);
    setSaving(true);
    setError(null);
    try {
      const { buttons } = await api.setButtons(code, token, cleaned);
      saveHostButtons(buttons);
      setDraft(null);
    } catch (e) {
      setError(actionErrorMessage(e, "저장하지 못했어요."));
    } finally {
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <section className="flex flex-col gap-3 rounded-3xl bg-zinc-900 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">빠른 요청 버튼 {saved.length}/{MAX_CUSTOM_BUTTONS}</h2>
          <button type="button" onClick={() => setDraft(saved)} className="min-h-11 rounded-xl bg-zinc-800 px-4 font-semibold">
            편집
          </button>
        </div>
        {saved.length > 0 ? (
          <p className="text-zinc-400">{saved.map((b) => b.label).join(" · ")}</p>
        ) : (
          <p className="text-sm text-zinc-500">모든 참가자 화면에 보일 한 번에 보내는 버튼을 만들 수 있어요.</p>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border-2 border-indigo-400/60 bg-zinc-900 p-4">
      <h2 className="font-bold">빠른 요청 버튼 편집</h2>
      <p className="text-sm text-zinc-500">저장하면 모든 참가자에게 바로 적용되고, 다음 방을 만들 때도 불러와요.</p>
      <ButtonListEditor buttons={draft} onChange={setDraft} />
      {error ? <p className="text-red-400">{error}</p> : null}
      <div className="flex gap-3">
        <button type="button" onClick={() => setDraft(null)} disabled={saving} className={`${secondaryButton} flex-1`}>
          취소
        </button>
        <button type="button" onClick={() => void save()} disabled={saving} className={`${primaryButton} flex-1`}>
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </section>
  );
}
