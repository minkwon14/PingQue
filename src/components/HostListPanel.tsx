"use client";

import { useState } from "react";
import { ButtonListEditor } from "@/components/ButtonListEditor";
import { primaryButton, secondaryButton } from "@/components/ui";
import { actionErrorMessage } from "@/lib/client/api";
import { newRequestId } from "@/lib/client/id";

/** Host-only editor for a short list of phrases (announcement presets, join roles). */
export function HostListPanel({
  title,
  hint,
  emptyHint,
  itemName,
  saved,
  maxItems,
  maxLength,
  onSave,
}: {
  title: string;
  hint: string;
  emptyHint: string;
  itemName: string;
  saved: string[];
  maxItems: number;
  maxLength: number;
  /** Persists the cleaned list and resolves with what the server stored. */
  onSave: (items: string[]) => Promise<string[]>;
}) {
  const [draft, setDraft] = useState<{ id: string; label: string }[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft) return;
    const cleaned = draft.map((d) => d.label.trim()).filter(Boolean);
    setSaving(true);
    setError(null);
    try {
      await onSave(cleaned);
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
          <h2 className="font-bold">
            {title} {saved.length}/{maxItems}
          </h2>
          <button
            type="button"
            onClick={() => setDraft(saved.map((label) => ({ id: newRequestId(), label })))}
            className="min-h-11 rounded-xl bg-zinc-800 px-4 font-semibold"
          >
            편집
          </button>
        </div>
        {saved.length > 0 ? (
          <p className="text-zinc-400">{saved.join(" · ")}</p>
        ) : (
          <p className="text-sm text-zinc-500">{emptyHint}</p>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border-2 border-indigo-400/60 bg-zinc-900 p-4">
      <h2 className="font-bold">{title} 편집</h2>
      <p className="text-sm text-zinc-500">{hint}</p>
      <ButtonListEditor
        buttons={draft}
        onChange={setDraft}
        maxItems={maxItems}
        maxLength={maxLength}
        itemName={itemName}
      />
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
