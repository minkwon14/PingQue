"use client";

import { useState } from "react";
import { inputFieldOnCard } from "@/components/ui";
import { newRequestId } from "@/lib/client/id";
import { CUSTOM_BUTTON_LABEL_MAX_LENGTH, MAX_CUSTOM_BUTTONS } from "@/lib/config";
import type { RoomButton } from "@/lib/domain/types";

const iconButton =
  "grid size-11 shrink-0 place-items-center rounded-btn border border-tc-line bg-tc-raised text-lg font-semibold transition-colors hover:bg-tc-off active:bg-tc-off disabled:opacity-30";

/** Controlled editor for a short list of quick buttons: add, rename, remove, reorder. */
export function ButtonListEditor({
  buttons,
  onChange,
  maxItems = MAX_CUSTOM_BUTTONS,
  maxLength = CUSTOM_BUTTON_LABEL_MAX_LENGTH,
  itemName = "버튼",
}: {
  buttons: RoomButton[];
  onChange: (buttons: RoomButton[]) => void;
  maxItems?: number;
  maxLength?: number;
  /** Noun used in labels and placeholders, e.g. "버튼", "문구", "역할". */
  itemName?: string;
}) {
  const [draft, setDraft] = useState("");
  const full = buttons.length >= maxItems;
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
              maxLength={maxLength}
              aria-label={`${itemName} ${i + 1} 이름`}
              onChange={(e) =>
                onChange(buttons.map((b) => (b.id === button.id ? { ...b, label: e.target.value } : b)))
              }
              className={`${inputFieldOnCard} min-w-0 flex-1 font-semibold`}
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
              className={`${iconButton} text-tc-red`}
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
          maxLength={maxLength}
          disabled={full}
          placeholder={full ? `최대 ${maxItems}개까지 만들 수 있어요` : `새 ${itemName} 이름`}
          className={`${inputFieldOnCard} min-w-0 flex-1 placeholder:text-base`}
        />
        <button
          type="submit"
          disabled={full || !newLabel}
          className="min-h-11 shrink-0 rounded-btn bg-tc-amber px-4 font-bold text-tc-ink transition-colors hover:bg-[#ffc552] active:bg-[#ffc552] disabled:opacity-40"
        >
          추가
        </button>
      </form>
    </div>
  );
}
