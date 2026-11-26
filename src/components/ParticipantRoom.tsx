"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuickButtons } from "@/components/QuickButtons";
import { ConnectionBanner, ConnectionIndicator, Notice, StatusBadge } from "@/components/ui";
import { actionErrorMessage, ApiError, api } from "@/lib/client/api";
import { formatCountdown, timeAgo } from "@/lib/client/format";
import { newRequestId } from "@/lib/client/id";
import { deviceKey, parseDevice, useStoredValue, writeStored } from "@/lib/client/storage";
import { currentTime, useNow } from "@/lib/client/useNow";
import { useRoomSnapshot } from "@/lib/client/useRoomSnapshot";
import { isActive } from "@/lib/domain/rules";
import { getTemplate } from "@/lib/domain/templates";
import type { PingRequest, RequestStatus } from "@/lib/domain/types";
import { REQUEST_RATE_LIMIT_MS, UNDO_WINDOW_MS } from "@/lib/config";

const SEND_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function ParticipantRoom({ code }: { code: string }) {
  const router = useRouter();
  const raw = useStoredValue(deviceKey(code));
  const device = useMemo(() => parseDevice(raw), [raw]);
  const { snapshot, fatal, connection, clockOffset, applyRequest } = useRoomSnapshot(
    code,
    device?.token,
  );
  const now = useNow(200);

  const [picked, setPicked] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ id: string; label: string; until: number } | null>(null);
  const pendingId = useRef<{ key: string; id: string } | null>(null);

  const needsJoin = raw === null || (typeof raw === "string" && !device);
  const lostAccess = fatal !== null && [401, 403, 404].includes(fatal.status);

  useEffect(() => {
    if (needsJoin) {
      router.replace(`/join/${code}`);
    } else if (lostAccess) {
      writeStored(deviceKey(code), null);
      router.replace(`/join/${code}`);
    }
  }, [needsJoin, lostAccess, code, router]);

  if (fatal?.status === 410) {
    return (
      <Notice
        title="방이 종료되었어요"
        action={
          <Link href="/" className="text-indigo-300 underline">
            처음으로
          </Link>
        }
      >
        호스트가 새 방을 만들면 다시 참여할 수 있어요.
      </Notice>
    );
  }
  if (!device || !snapshot || snapshot.viewer.kind !== "participant") {
    if (connection.status === "connected") {
      return <Notice title={fatal ? "다시 연결하는 중…" : "불러오는 중…"} />;
    }
    return (
      <Notice title="서버에 연결할 수 없어요">
        {connection.status === "offline"
          ? "인터넷 연결을 확인해 주세요. 연결되면 자동으로 다시 시도해요."
          : `${connection.error ?? ""} 다시 시도하는 중…`}
      </Notice>
    );
  }

  const template = getTemplate(snapshot.room.templateId);
  if (!template) return <Notice title="알 수 없는 방이에요" />;
  const token = device.token;
  const me = snapshot.viewer.participant;

  const serverNow = now + clockOffset;
  const remaining = snapshot.room.expiresAt - serverNow;
  const expired = remaining <= 0;
  const step = template.steps[picked.length];
  const locked = sending || now < lockedUntil || expired;

  const requests = [...snapshot.requests].sort((a, b) => b.createdAt - a.createdAt);
  const undoVisible = undo !== null && now < undo.until;

  type SendInput = { selections: string[] } | { text: string };

  async function post(input: SendInput): Promise<PingRequest> {
    const key = "text" in input ? `text:${input.text}` : input.selections.join("|");
    if (pendingId.current?.key !== key) {
      pendingId.current = { key, id: newRequestId() };
    }
    const { id } = pendingId.current;
    for (let attempt = 1; ; attempt++) {
      try {
        return await api.sendRequest(code, token, { id, ...input });
      } catch (error) {
        const retryable = error instanceof ApiError && error.code === "network";
        if (!retryable || attempt >= SEND_ATTEMPTS) throw error;
        await sleep(500 * attempt);
      }
    }
  }

  async function choose(optionId: string) {
    const next = [...picked, optionId];
    if (next.length < template!.steps.length) {
      setPicked(next);
      return;
    }
    await submit({ selections: next });
  }

  async function submit(input: SendInput) {
    setSending(true);
    setSendError(null);
    try {
      const request = await post(input);
      pendingId.current = null;
      applyRequest(request);
      setPicked([]);
      setUndo({ id: request.id, label: request.label, until: currentTime() + UNDO_WINDOW_MS });
      setLockedUntil(currentTime() + REQUEST_RATE_LIMIT_MS);
      navigator.vibrate?.(40);
    } catch (error) {
      if (error instanceof ApiError && error.code === "rate_limited") {
        setSendError("너무 빨라요. 잠깐 뒤에 다시 눌러 주세요.");
        setLockedUntil(currentTime() + (error.retryAfterMs ?? REQUEST_RATE_LIMIT_MS));
      } else {
        setSendError(actionErrorMessage(error, "보내지 못했어요."));
      }
    } finally {
      setSending(false);
    }
  }

  async function cancel(id: string) {
    try {
      applyRequest(await api.setStatus(code, token, id, "cancelled"));
      setUndo((u) => (u?.id === id ? null : u));
    } catch (error) {
      setSendError(actionErrorMessage(error, "취소하지 못했어요."));
    }
  }

  const pickedLabels = picked.map(
    (id, i) => template.steps[i].options.find((o) => o.id === id)?.label ?? id,
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-800 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">
            {me.name} <span className="font-normal text-zinc-400">· {me.role}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            방 {code}
            <ConnectionIndicator status={connection.status} />
          </div>
          {snapshot.connectedCount !== undefined && connection.status === "connected" ? (
            <div className="text-xs text-zinc-500">접속 중 {snapshot.connectedCount}명</div>
          ) : null}
        </div>
        <div className="text-right">
          <div className={`font-mono text-xl font-bold ${remaining < 120_000 ? "text-amber-300" : ""}`}>
            {formatCountdown(remaining)}
          </div>
          <div className="text-xs text-zinc-500">남은 시간</div>
        </div>
      </header>

      <ConnectionBanner connection={connection} />

      <main className={`flex flex-1 flex-col gap-6 p-4 ${undoVisible ? "pb-32" : ""}`}>
        {expired ? (
          <p className="rounded-2xl bg-zinc-800 p-6 text-center text-lg">방이 종료되었어요.</p>
        ) : (
          <section aria-live="polite" className="flex flex-col gap-4">
            <div className="flex min-h-10 flex-wrap items-center gap-2">
              {picked.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setPicked(picked.slice(0, -1))}
                  className="min-h-10 rounded-full bg-zinc-800 px-4 font-semibold"
                >
                  ← 이전
                </button>
              ) : null}
              {pickedLabels.map((label, i) => (
                <span key={i} className="rounded-full bg-indigo-500/20 px-3 py-1 font-semibold text-indigo-200">
                  {label}
                </span>
              ))}
            </div>
            <h2 className="text-2xl font-black">
              {step.title}{" "}
              <span className="text-base font-normal text-zinc-500">
                {picked.length + 1}/{template.steps.length}
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {step.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={locked}
                  onClick={() => void choose(option.id)}
                  className="min-h-28 rounded-3xl bg-zinc-800 px-3 text-2xl font-bold text-zinc-50 shadow-lg active:scale-[0.97] active:bg-indigo-500 disabled:opacity-40"
                >
                  {option.label}
                </button>
              ))}
            </div>
            {sendError ? <p className="text-red-400">{sendError}</p> : null}
          </section>
        )}

        {!expired && picked.length === 0 ? (
          <QuickButtons
            shared={snapshot.room.buttons}
            disabled={locked}
            onSend={(text) => void submit({ text })}
          />
        ) : null}

        {undoVisible && undo ? (
          <div
            role="status"
            className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-t-3xl bg-emerald-600 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="min-w-0">
              <div className="font-bold">보냈어요</div>
              <div className="truncate text-sm text-emerald-50">{undo.label}</div>
            </div>
            <button
              type="button"
              onClick={() => void cancel(undo.id)}
              className="min-h-12 shrink-0 rounded-2xl bg-black/30 px-5 text-lg font-bold"
            >
              되돌리기 {Math.max(0, Math.ceil((undo.until - now) / 1000))}
            </button>
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-zinc-300">내 요청</h2>
          {requests.length === 0 ? (
            <p className="text-zinc-500">아직 보낸 요청이 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {requests.slice(0, 20).map((r) => (
                <li key={r.id} className="rounded-2xl bg-zinc-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`text-lg font-bold ${r.status === "cancelled" ? "text-zinc-500 line-through" : ""}`}>
                      {r.label}
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <Progress status={r.status} />
                    <span className="text-sm text-zinc-500">{timeAgo(serverNow - r.createdAt)}</span>
                  </div>
                  {isActive(r.status) ? (
                    <button
                      type="button"
                      onClick={() => void cancel(r.id)}
                      className="mt-3 min-h-12 w-full rounded-2xl bg-zinc-800 font-semibold text-zinc-200 active:bg-zinc-700"
                    >
                      요청 취소
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

const STEPS: { status: RequestStatus; label: string }[] = [
  { status: "received", label: "접수" },
  { status: "confirmed", label: "확인" },
  { status: "done", label: "완료" },
];

function Progress({ status }: { status: RequestStatus }) {
  if (status === "cancelled") return <span className="text-sm text-zinc-500">취소됨</span>;
  const reached = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="flex items-center gap-2" aria-label="진행 상태">
      {STEPS.map((s, i) => (
        <li key={s.status} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-full ${i <= reached ? "bg-emerald-400" : "bg-zinc-700"}`} />
          <span className={`text-sm ${i <= reached ? "text-zinc-200" : "text-zinc-600"}`}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
