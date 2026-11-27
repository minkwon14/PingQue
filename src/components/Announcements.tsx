"use client";

import { useState } from "react";
import { fieldBase, Lamp, panel, primaryButton } from "@/components/ui";
import { actionErrorMessage, api } from "@/lib/client/api";
import { timeAgo } from "@/lib/client/format";
import { dismissedAnnouncementKey, useStoredValue, writeStored } from "@/lib/client/storage";
import { ANNOUNCEMENT_MAX_LENGTH } from "@/lib/config";
import type { Announcement } from "@/lib/domain/types";

const HOST_HISTORY_VISIBLE = 5;

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
        className="flex items-start justify-between gap-3 border-b-4 border-tc-amber bg-tc-amber/15 px-4 py-4"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-semibold text-tc-amber">
            <Lamp tone="amber" className="size-2.5" />
            호스트 공지
          </div>
          <div className="mt-1 font-display text-3xl leading-snug font-bold break-words">{announcement.text}</div>
        </div>
        <button
          type="button"
          onClick={() => writeStored(dismissedAnnouncementKey(code), announcement.id)}
          className="min-h-12 shrink-0 rounded-btn border border-tc-amber/60 px-4 font-semibold text-tc-amber active:bg-tc-amber/20"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

/** Participant view: every announcement kept for the room, newest first. Independent of banner dismissal. */
export function AnnouncementHistory({
  announcements,
  serverNow,
}: {
  announcements: Announcement[];
  serverNow: number;
}) {
  const [open, setOpen] = useState(false);
  if (announcements.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`${panel} flex min-h-12 items-center justify-between gap-3 px-4 font-semibold text-tc-chalk active:bg-tc-raised`}
      >
        <span>받은 공지 {announcements.length}개</span>
        <span aria-hidden className="text-tc-muted">
          {open ? "접기 ▲" : "보기 ▼"}
        </span>
      </button>
      {open ? (
        <ul className={`${panel} flex flex-col gap-3 p-4`}>
          {announcements.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words text-lg font-semibold">{a.text}</span>
              <span className="shrink-0 pt-1 text-sm text-tc-muted">{timeAgo(serverNow - a.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Host view: free text or the room's preset phrases, plus the recent announcement history. */
export function HostAnnouncePanel({
  code,
  token,
  presets,
  announcements,
  serverNow,
}: {
  code: string;
  token: string;
  presets: string[];
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
    <section className={`${panel} flex flex-col gap-3 p-4`}>
      <h2 className="text-lg font-semibold">모두에게 공지</h2>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={sending}
            onClick={() => void send(preset)}
            className="min-h-12 rounded-full border border-tc-amber/40 bg-tc-amber/10 px-5 font-semibold text-tc-amber transition-colors hover:bg-tc-amber/20 active:bg-tc-amber active:text-tc-ink disabled:opacity-40"
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
          className={`${fieldBase} min-h-14 min-w-0 flex-1 bg-tc-bg text-lg`}
        />
        <button type="submit" disabled={sending || !text.trim()} className={primaryButton}>
          보내기
        </button>
      </form>
      {error ? <p className="font-medium text-tc-red">{error}</p> : null}
      {announcements.length > 0 ? (
        <ul className="flex flex-col gap-1.5 border-t border-tc-line pt-3 text-base text-tc-muted">
          {announcements.slice(0, HOST_HISTORY_VISIBLE).map((a, i) => (
            <li key={a.id} className="flex justify-between gap-3">
              <span className={`min-w-0 truncate ${i === 0 ? "font-semibold text-tc-chalk" : ""}`}>{a.text}</span>
              <span className="shrink-0 text-tc-dim">{timeAgo(serverNow - a.createdAt)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
