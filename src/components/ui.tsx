import type { ConnectionState, ConnectionStatus } from "@/lib/client/useRoomSnapshot";
import type { RequestStatus } from "@/lib/domain/types";

export const STATUS_LABEL: Record<RequestStatus, string> = {
  received: "접수됨",
  confirmed: "확인됨",
  done: "완료",
  cancelled: "취소됨",
};

const STATUS_STYLE: Record<RequestStatus, string> = {
  received: "bg-amber-400/20 text-amber-200",
  confirmed: "bg-sky-400/20 text-sky-200",
  done: "bg-emerald-400/20 text-emerald-200",
  cancelled: "bg-zinc-500/20 text-zinc-400",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  connected: "연결됨",
  reconnecting: "재연결 중",
  offline: "오프라인",
};

const CONNECTION_DOT: Record<ConnectionStatus, string> = {
  connected: "bg-emerald-400",
  reconnecting: "bg-amber-400 animate-pulse",
  offline: "bg-red-500",
};

export function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${CONNECTION_DOT[status]}`} />
      {CONNECTION_LABEL[status]}
    </span>
  );
}

export function ConnectionBanner({ connection }: { connection: ConnectionState }) {
  if (connection.status === "connected") return null;
  const offline = connection.status === "offline";
  return (
    <div
      role="alert"
      className={`px-4 py-2 text-center text-sm ${
        offline ? "bg-red-500/20 text-red-200" : "bg-amber-500/20 text-amber-200"
      }`}
    >
      {offline
        ? "인터넷 연결이 끊겼어요. 연결되면 자동으로 다시 시작해요."
        : `${connection.error ?? "서버와 연결이 끊겼어요."} 다시 연결하는 중…`}
    </div>
  );
}

export function Notice({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children ? <p className="text-zinc-400">{children}</p> : null}
      {action}
    </main>
  );
}

export const primaryButton =
  "min-h-14 rounded-2xl bg-indigo-500 px-6 text-lg font-bold text-white active:bg-indigo-400 disabled:opacity-40";
export const secondaryButton =
  "min-h-14 rounded-2xl bg-zinc-800 px-6 text-lg font-semibold text-zinc-100 active:bg-zinc-700 disabled:opacity-40";

export function ConfirmDialog({
  title,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-zinc-900 p-6"
      >
        <h2 className="text-xl font-bold">{title}</h2>
        {children ? <p className="text-zinc-400">{children}</p> : null}
        <div className="flex gap-3">
          <button type="button" disabled={busy} onClick={onCancel} className={`${secondaryButton} flex-1`}>
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="min-h-14 flex-1 rounded-2xl bg-red-600 px-6 text-lg font-bold text-white active:bg-red-500 disabled:opacity-40"
          >
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
