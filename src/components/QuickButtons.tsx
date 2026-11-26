"use client";

import { useMemo } from "react";
import { ButtonListEditor } from "@/components/ButtonListEditor";
import { parseButtons, PERSONAL_BUTTONS_KEY, savePersonalButtons } from "@/lib/client/buttons";
import { useStoredValue } from "@/lib/client/storage";
import type { RoomButton } from "@/lib/domain/types";

/** One-tap buttons: the host's shared set plus this device's own (kept in localStorage only). */
export function QuickButtons({
  shared,
  disabled,
  onSend,
}: {
  shared: RoomButton[];
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const raw = useStoredValue(PERSONAL_BUTTONS_KEY);
  const personal = useMemo(() => parseButtons(raw), [raw]);

  const tile = (button: RoomButton, own: boolean) => (
    <button
      key={button.id}
      type="button"
      disabled={disabled}
      onClick={() => onSend(button.label)}
      className={`min-h-20 rounded-3xl px-3 text-xl font-bold shadow-lg active:scale-[0.97] active:bg-indigo-500 disabled:opacity-40 ${
        own ? "bg-zinc-800/70 text-zinc-100 ring-2 ring-zinc-700" : "bg-zinc-800 text-zinc-50"
      }`}
    >
      {button.label}
    </button>
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-zinc-300">빠른 요청</h2>
      {shared.length + personal.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {shared.map((b) => tile(b, false))}
          {personal.map((b) => tile(b, true))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">설정에서 나만 쓰는 버튼을 만들어 두면 한 번에 보낼 수 있어요.</p>
      )}
    </section>
  );
}

/** Editor for this device's own quick buttons. */
export function PersonalButtonsEditor() {
  const raw = useStoredValue(PERSONAL_BUTTONS_KEY);
  const personal = useMemo(() => parseButtons(raw), [raw]);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-zinc-300">내 빠른 요청 버튼</h2>
      <div className="rounded-2xl bg-zinc-900 p-3">
        <p className="mb-3 text-sm text-zinc-500">내 버튼은 이 기기에만 저장되고 다른 사람에게는 보이지 않아요.</p>
        <ButtonListEditor buttons={personal} onChange={savePersonalButtons} />
      </div>
    </section>
  );
}
