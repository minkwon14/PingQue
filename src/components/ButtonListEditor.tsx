"use client";

import { useState } from "react";
import { newRequestId } from "@/lib/client/id";
import { CUSTOM_BUTTON_LABEL_MAX_LENGTH, MAX_CUSTOM_BUTTONS } from "@/lib/config";
import type { RoomButton } from "@/lib/domain/types";

const iconButton =
  "grid size-11 shrink-0 place-items-center rounded-xl bg-zinc-800 text-lg font-bold active:bg-zinc-700 disabled:opacity-30";

/** Controlled editor for a short list of quick buttons: add, rename, remove, reorder. */
export function ButtonListEditor({
  buttons,
  onChange,
}: {
  buttons: RoomButton[];
  onChange: (buttons: RoomButton[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const full = buttons.length >= MAX_CUSTOM_BUTTONS;
  const newLabel = draft.trim();

  function move(index: number, delta: number) {
    const next = [...buttons];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  }

  function add() {
    if (!newLabel || full) return;
    onChange([...buttons, { id: newRequestId(), label: newLabel }]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {buttons.map((button, i) => (
          <li key={button.id} className="flex items-center gap-2">
            <input
              value={button.label}
              maxLength={CUSTOM_BUTTON_LABEL_MAX_LENGTH}
              aria-label={`버튼 ${i + 1} 이름`}
              onChange={(e) =>
                onChange(buttons.map((b) => (b.id === button.id ? { ...b, label: e.target.value } : b)))
              }
              className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-zinc-800 bg-zinc-900 px-3 text-lg font-semibold"
            />
            <button type="button" aria-label="위로" disabled={i === 0} onClick={() => move(i, -1)} className={iconButton}>
              ↑
            </button>
            <button
              type="button"
              aria-label="아래로"
              disabled={i === buttons.length - 1}
              onClick={() => move(i, 1)}
              className={iconButton}
            >
              ↓
            </button>
            <button
              type="button"
              aria-label="삭제"
              onClick={() => onChange(buttons.filter((b) => b.id !== button.id))}
              className={`${iconButton} text-red-300`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={CUSTOM_BUTTON_LABEL_MAX_LENGTH}
          disabled={full}
          placeholder={full ? `최대 ${MAX_CUSTOM_BUTTONS}개까지 만들 수 있어요` : "새 버튼 이름"}
          className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-zinc-800 bg-zinc-900 px-3 text-lg placeholder:text-base"
        />
        <button
          type="submit"
          disabled={full || !newLabel}
          className="min-h-11 shrink-0 rounded-xl bg-indigo-500 px-4 font-bold text-white active:bg-indigo-400 disabled:opacity-40"
        >
          추가
        </button>
      </form>
    </div>
  );
}
