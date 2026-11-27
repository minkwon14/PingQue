"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { HostAnnouncePanel } from "@/components/Announcements";
import { HostButtonsPanel } from "@/components/HostButtonsPanel";
import { HostListPanel } from "@/components/HostListPanel";
import { SettingsButton, SettingsSheet } from "@/components/SettingsSheet";
import {
  ConfirmDialog,
  ConnectionBanner,
  ConnectionIndicator,
  Notice,
  primaryButton,
  secondaryButton,
  StatusBadge,
} from "@/components/ui";
import { actionErrorMessage, api } from "@/lib/client/api";
import { formatCountdown, groupedCode, timeAgo } from "@/lib/client/format";
import { saveHostPresets, saveHostRoles } from "@/lib/client/hostLists";
import { hostKey, useStoredValue } from "@/lib/client/storage";
import { useNow } from "@/lib/client/useNow";
import { useRoomSnapshot } from "@/lib/client/useRoomSnapshot";
import {
  ANNOUNCEMENT_MAX_LENGTH,
  MAX_ANNOUNCEMENT_PRESETS,
  MAX_ROLES,
  ROLE_MAX_LENGTH,
} from "@/lib/config";
import { getTemplate } from "@/lib/domain/templates";
import type { Participant, PingRequest, RequestStatus } from "@/lib/domain/types";

const noopSubscribe = () => () => {};

function useLocation(): { origin: string; hostname: string } | null {
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const hostname = useSyncExternalStore(noopSubscribe, () => window.location.hostname, () => "");
  return origin ? { origin, hostname } : null;
}

function useWakeLock(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
        setActive(true);
        lock.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && (!sentinel || sentinel.released)) {
        void acquire();
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, []);
  return active;
}

export function HostRoom({ code, publicOrigin }: { code: string; publicOrigin?: string }) {
  const token = useStoredValue(hostKey(code));
  const { snapshot, fatal, connection, clockOffset, newRequestTick, applyRequest } = useRoomSnapshot(
    code,
    token,
  );
  const now = useNow(1000);
  const location = useLocation();
  const wakeLock = useWakeLock();
  const [inviteOpen, setInviteOpen] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);

  const participantsById = useMemo(() => {
    const map = new Map<string, Participant>();
    snapshot?.participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [snapshot]);

  const home = (
    <Link href="/start" className="text-indigo-300 underline">
      처음으로
    </Link>
  );

  if (token === null) {
    return (
      <Notice title="이 기기는 이 방의 호스트가 아니에요" action={home}>
        방을 만든 기기에서 열어 주세요.
      </Notice>
    );
  }
  if (closed || fatal?.code === "room_closed") {
    return (
      <Notice title="방을 종료했어요" action={home}>
        참가자들은 참여 화면으로 돌아가요.
      </Notice>
    );
  }
  if (fatal?.status === 410) {
    return (
      <Notice title="방이 종료되었어요" action={home}>
        새 방을 만들어 다시 시작할 수 있어요.
      </Notice>
    );
  }
  if (fatal) {
    return (
      <Notice title="방을 불러올 수 없어요" action={home}>
        {fatal.status === 404
          ? "서버가 다시 시작되었거나 방이 없어졌어요."
          : fatal.message}
      </Notice>
    );
  }
  if (!snapshot || snapshot.viewer.kind !== "receiver") {
    return connection.status === "connected" ? (
      <Notice title="불러오는 중…" />
    ) : (
      <Notice title="서버에 연결할 수 없어요">
        {connection.status === "offline"
          ? "인터넷 연결을 확인해 주세요. 연결되면 자동으로 다시 시도해요."
          : `${connection.error ?? ""} 다시 시도하는 중…`}
      </Notice>
    );
  }

  const template = getTemplate(snapshot.room.templateId);
  const serverNow = now + clockOffset;
  const remaining = snapshot.room.expiresAt - serverNow;
  const expired = remaining <= 0;

  const sorted = [...snapshot.requests].sort((a, b) => a.createdAt - b.createdAt);
  const received = sorted.filter((r) => r.status === "received");
  const confirmed = sorted.filter((r) => r.status === "confirmed");
  const finished = sorted
    .filter((r) => r.status === "done" || r.status === "cancelled")
    .reverse()
    .slice(0, 10);
  const [primary, ...waiting] = received;

  const joinOrigin = publicOrigin ?? location?.origin;
  const joinUrl = joinOrigin ? `${joinOrigin}/join/${code}` : "";
  const isLocalhost = location && !publicOrigin ? /^(localhost|127\.|\[?::1\]?$)/.test(location.hostname) : false;
  const showInvite = inviteOpen ?? snapshot.participantCount === 0;

  async function setStatus(request: PingRequest, status: RequestStatus) {
    setBusy((prev) => new Set(prev).add(request.id));
    setActionError(null);
    try {
      applyRequest(await api.setStatus(code, token as string, request.id, status));
    } catch (error) {
      setActionError(actionErrorMessage(error, "처리하지 못했어요."));
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  }

  async function closeRoom() {
    setClosing(true);
    setActionError(null);
    try {
      await api.closeRoom(code, token as string);
      setClosed(true);
    } catch (error) {
      setConfirmClose(false);
      setActionError(actionErrorMessage(error, "방을 종료하지 못했어요."));
    } finally {
      setClosing(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("복사할 수 없어요. 링크를 길게 눌러 복사해 주세요.");
    }
  }

  const card = (request: PingRequest, variant: "primary" | "normal") => (
    <RequestCard
      key={request.id}
      request={request}
      sender={participantsById.get(request.senderId)}
      ageMs={serverNow - request.createdAt}
      variant={variant}
      busy={busy.has(request.id)}
      onStatus={(status) => void setStatus(request, status)}
    />
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col pb-[env(safe-area-inset-bottom)]">
      <div
        key={newRequestTick}
        aria-hidden
        className={`pointer-events-none fixed inset-0 z-30 ${newRequestTick > 0 ? "pq-flash" : ""}`}
      />

      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            {template?.name ?? "방"}
            <ConnectionIndicator status={connection.status} />
          </div>
          <div className="font-mono text-3xl font-black tracking-widest">{groupedCode(code)}</div>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <div className="text-xl font-bold">
              {snapshot.participantCount}/{snapshot.room.maxParticipants}
            </div>
            <div className="text-xs text-zinc-500">
              참여자 · 접속 {snapshot.connectedCount ?? 0}
            </div>
          </div>
          <div>
            <div className={`font-mono text-xl font-bold ${remaining < 120_000 ? "text-amber-300" : ""}`}>
              {formatCountdown(remaining)}
            </div>
            <div className="text-xs text-zinc-500">남은 시간</div>
          </div>
          <button
            type="button"
            onClick={() => setInviteOpen(!showInvite)}
            className="min-h-12 shrink-0 whitespace-nowrap rounded-2xl bg-zinc-800 px-4 font-semibold"
          >
            {showInvite ? "초대 닫기" : "초대 / QR"}
          </button>
          <SettingsButton onClick={() => setSettingsOpen(true)} />
        </div>
      </header>

      <ConnectionBanner connection={connection} />
      {expired ? (
        <div className="bg-red-500/20 px-4 py-2 text-center text-red-200">방이 종료되었어요.</div>
      ) : null}

      <main className="flex flex-1 flex-col gap-6 p-4">
        {showInvite ? (
          <section className="flex flex-col items-center gap-4 rounded-3xl bg-zinc-900 p-6 text-center sm:flex-row sm:text-left">
            <div className="rounded-2xl bg-white p-2">
              {joinUrl ? <QRCodeSVG value={joinUrl} size={200} level="M" marginSize={1} /> : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div>
                <div className="text-sm text-zinc-500">참여 코드</div>
                <div className="font-mono text-4xl font-black tracking-widest">{groupedCode(code)}</div>
              </div>
              <div className="break-all text-sm text-zinc-300 select-all">{joinUrl}</div>
              <button type="button" onClick={() => void copyLink()} className={secondaryButton}>
                {copied ? "복사했어요" : "링크 복사"}
              </button>
              {isLocalhost ? (
                <p className="rounded-xl bg-amber-500/15 p-3 text-sm text-amber-200">
                  지금 주소는 <b>{location?.hostname}</b> 이라 다른 기기에서 열 수 없어요. 같은
                  Wi-Fi의 IP 주소(예: http://192.168.0.5:3000)로 이 페이지를 다시 열면 QR이 올바르게 만들어져요.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {actionError ? <p className="text-red-400">{actionError}</p> : null}

        <HostAnnouncePanel
          code={code}
          token={token as string}
          presets={snapshot.room.announcementPresets}
          announcements={snapshot.announcements}
          serverNow={serverNow}
        />

        {primary ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold tracking-wide text-amber-300">가장 오래된 대기 요청</h2>
            {card(primary, "primary")}
          </section>
        ) : (
          <section className="rounded-3xl border-2 border-dashed border-zinc-800 p-10 text-center text-xl text-zinc-500">
            {snapshot.requests.length === 0 ? "아직 요청이 없어요" : "대기 중인 요청이 없어요"}
          </section>
        )}

        {waiting.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-zinc-400">대기 중 {waiting.length}건</h2>
            <div className="flex flex-col gap-3">{waiting.map((r) => card(r, "normal"))}</div>
          </section>
        ) : null}

        {confirmed.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-sky-300">확인함 {confirmed.length}건</h2>
            <div className="flex flex-col gap-3">{confirmed.map((r) => card(r, "normal"))}</div>
          </section>
        ) : null}

        {finished.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-bold text-zinc-500">최근 처리됨</h2>
            <ul className="flex flex-col gap-2">
              {finished.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-900/60 px-4 py-3 text-zinc-400">
                  <span className="min-w-0 truncate">
                    <b className="text-zinc-300">{participantsById.get(r.senderId)?.name ?? "나간 참가자"}</b> · {r.label}
                  </span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <footer className="flex flex-col items-center gap-3 px-4 py-3 text-center text-xs text-zinc-600">
        <button
          type="button"
          onClick={() => setConfirmClose(true)}
          className="min-h-12 rounded-2xl bg-zinc-900 px-6 text-base font-semibold text-red-300 active:bg-zinc-800"
        >
          방 종료
        </button>
        {wakeLock ? "화면 켜짐 유지 중" : "이 화면을 계속 켜 두세요 (자동 화면 켜짐 유지를 쓸 수 없어요)"}
      </footer>
      {settingsOpen ? (
        <SettingsSheet onClose={() => setSettingsOpen(false)}>
          <HostListPanel
            title="공지 문구"
            itemName="문구"
            hint="저장하면 위 공지 버튼에 바로 적용되고, 다음 방을 만들 때도 불러와요."
            emptyHint="자주 보내는 공지를 버튼으로 만들어 둘 수 있어요."
            saved={snapshot.room.announcementPresets}
            maxItems={MAX_ANNOUNCEMENT_PRESETS}
            maxLength={ANNOUNCEMENT_MAX_LENGTH}
            onSave={async (items) => {
              const { presets } = await api.setAnnouncementPresets(code, token as string, items);
              saveHostPresets(presets);
              return presets;
            }}
          />

          <HostButtonsPanel code={code} token={token as string} saved={snapshot.room.buttons} />

          <HostListPanel
            title="참가 역할 목록"
            itemName="역할"
            hint="참가자가 입장할 때 고를 수 있는 역할이에요. 직접 입력도 항상 가능하고, 같은 템플릿으로 다음 방을 만들 때도 불러와요."
            emptyHint="목록이 비어 있으면 참가자가 역할을 직접 입력해요."
            saved={snapshot.room.roles}
            maxItems={MAX_ROLES}
            maxLength={ROLE_MAX_LENGTH}
            onSave={async (items) => {
              const { roles } = await api.setRoles(code, token as string, items);
              saveHostRoles(snapshot.room.templateId, roles);
              return roles;
            }}
          />
        </SettingsSheet>
      ) : null}
      {confirmClose ? (
        <ConfirmDialog
          title="방을 종료할까요?"
          confirmLabel="방 종료"
          busy={closing}
          onConfirm={() => void closeRoom()}
          onCancel={() => setConfirmClose(false)}
        >
          모든 참가자가 방에서 나가게 되고, 같은 코드로 다시 참여할 수 없어요.
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

function RequestCard({
  request,
  sender,
  ageMs,
  variant,
  busy,
  onStatus,
}: {
  request: PingRequest;
  sender: Participant | undefined;
  ageMs: number;
  variant: "primary" | "normal";
  busy: boolean;
  onStatus: (status: RequestStatus) => void;
}) {
  const primary = variant === "primary";
  return (
    <article
      className={`rounded-3xl p-5 ${
        primary ? "border-4 border-amber-400 bg-amber-400/10" : "border border-zinc-800 bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-zinc-400">
          <b className="text-zinc-100">{sender?.name ?? "나간 참가자"}</b>
          {sender ? ` · ${sender.role}` : ""}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500">{timeAgo(ageMs)}</span>
          <StatusBadge status={request.status} />
        </div>
      </div>
      <div className={`mt-3 font-black leading-tight ${primary ? "text-5xl" : "text-2xl"}`}>
        {request.label}
      </div>
      <div className="mt-4 flex gap-3">
        {request.status === "received" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus("confirmed")}
            className={`${primaryButton} flex-1 ${primary ? "min-h-20 text-2xl" : ""}`}
          >
            확인했어요
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => onStatus("done")}
          className={`flex-1 rounded-2xl bg-emerald-600 font-bold text-white active:bg-emerald-500 disabled:opacity-40 ${
            primary ? "min-h-20 text-2xl" : "min-h-14 text-lg"
          }`}
        >
          완료
        </button>
      </div>
    </article>
  );
}
