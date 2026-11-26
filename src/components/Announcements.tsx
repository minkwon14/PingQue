"use client";

import { useState } from "react";
import { primaryButton } from "@/components/ui";
import { actionErrorMessage, api } from "@/lib/client/api";
import { timeAgo } from "@/lib/client/format";
import { dismissedAnnouncementKey, useStoredValue, writeStored } from "@/lib/client/storage";
import { ANNOUNCEMENT_MAX_LENGTH, ANNOUNCEMENT_PRESETS } from "@/lib/config";
import type { Announcement } from "@/lib/domain/types";

/** Participant view: the active announcement, highlighted, until this device dismisses it. */
export function AnnouncementBanner({
  code,
  announcement,
}: {
  code: string;
  announcement: Announcement | undefined;
}) {
  const dismissedId = useStoredValue(dismissedAnnouncementKey(code));
  if (!announcement || dismissedId === undefined || dismissedId === announcement.id) return null;
  return (
    <div className="relative">
      <div
        key={announcement.id}
        aria-hidden
        className="pq-flash pointer-events-none fixed inset-0 z-30"
      />
      <div
        role="alert"
        className="flex items-start justify-between gap-3 border-b-4 border-amber-400 bg-amber-400/15 px-4 py-4"
      >
        <div className="min-w-0">
          <div className="text-sm font-bold text-amber-300">호스트 공지</div>
          <div className="text-3xl font-black leading-tight break-words">{announcement.text}</div>
        </div>
        <button
          type="button"
          onClick={() => writeStored(dismissedAnnouncementKey(code), announcement.id)}
          className="min-h-12 shrink-0 rounded-2xl bg-black/30 px-4 font-bold"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

/** Host view: free text or preset phrases, plus the recent announcement history. */
export function HostAnnouncePanel({
  code,
  token,
  announcements,
  serverNow,
}: {
  code: string;
  token: string;
  announcements: Announcement[];
  serverNow: number;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(value: string) {
    if (!value.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.announce(code, token, value);
      setText("");
    } catch (e) {
      setError(actionErrorMessage(e, "공지를 보내지 못했어요."));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-zinc-900 p-4">
      <h2 className="font-bold">모두에게 공지</h2>
      <div className="flex flex-wrap gap-2">
        {ANNOUNCEMENT_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={sending}
            onClick={() => void send(preset)}
            className="min-h-11 rounded-full bg-amber-400/20 px-4 font-semibold text-amber-200 active:bg-amber-400/40 disabled:opacity-40"
          >
            {preset}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text);
        }}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={ANNOUNCEMENT_MAX_LENGTH}
          placeholder="직접 입력"
          aria-label="공지 내용"
          className="min-h-14 min-w-0 flex-1 rounded-2xl bg-zinc-800 px-4 text-lg"
        />
        <button type="submit" disabled={sending || !text.trim()} className={primaryButton}>
          보내기
        </button>
      </form>
      {error ? <p className="text-red-400">{error}</p> : null}
      {announcements.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-zinc-400">
          {announcements.map((a, i) => (
            <li key={a.id} className="flex justify-between gap-3">
              <span className={`min-w-0 truncate ${i === 0 ? "font-bold text-zinc-200" : ""}`}>{a.text}</span>
              <span className="shrink-0 text-zinc-500">{timeAgo(serverNow - a.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
