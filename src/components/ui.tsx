import type { ConnectionState, ConnectionStatus } from "@/lib/client/useRoomSnapshot";
import type { RequestStatus } from "@/lib/domain/types";

export const STATUS_LABEL: Record<RequestStatus, string> = {
  received: "접수됨",
  confirmed: "확인됨",
  done: "완료",
  cancelled: "취소됨",
};

export type LampTone = "amber" | "blue" | "green" | "off";

/** Request lifecycle colours: received = amber, confirmed = periwinkle, done = green. */
export const STATUS_TONE: Record<RequestStatus, LampTone> = {
  received: "amber",
  confirmed: "blue",
  done: "green",
  cancelled: "off",
};

export function Lamp({ tone, className = "size-3" }: { tone: LampTone; className?: string }) {
  return <span aria-hidden data-tone={tone} className={`pq-lamp ${className}`} />;
}

/** Left edge of a request card, in its status colour. */
export const STATUS_EDGE: Record<RequestStatus, string> = {
  received: "border-l-tc-amber",
  confirmed: "border-l-tc-blue",
  done: "border-l-tc-green",
  cancelled: "border-l-tc-off",
};

const STATUS_STYLE: Record<RequestStatus, string> = {
  received: "bg-tc-amber/15 text-tc-amber",
  confirmed: "bg-tc-blue/15 text-tc-blue",
  done: "bg-tc-green/15 text-tc-green",
  cancelled: "bg-tc-off/60 text-tc-muted",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[status]}`}
    >
      <Lamp tone={STATUS_TONE[status]} className="size-2.5" />
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
  connected: "bg-tc-green",
  reconnecting: "bg-tc-amber animate-pulse",
  offline: "bg-tc-red",
};

export function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-tc-muted">
      <span aria-hidden className={`size-2.5 rounded-full ${CONNECTION_DOT[status]}`} />
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
      className={`border-b-2 px-4 py-2.5 text-center text-base font-medium ${
        offline
          ? "border-tc-red bg-tc-red/15 text-tc-red"
          : "border-tc-amber bg-tc-amber/15 text-tc-amber"
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
      <h1 className="font-display text-3xl leading-snug font-bold tracking-tight text-balance">{title}</h1>
      {children ? <p className="text-lg text-tc-muted">{children}</p> : null}
      {action}
    </main>
  );
}

export const linkClass = "font-semibold text-tc-amber underline underline-offset-4";

const buttonBase =
  "min-h-14 rounded-btn px-6 text-lg transition-[background-color,transform] active:translate-y-px disabled:opacity-40 disabled:active:translate-y-0";

/** Amber lamp: the one main action on a screen (create, join, send, save). */
export const primaryButton = `${buttonBase} bg-tc-amber font-bold text-tc-ink hover:bg-[#ffc552] active:bg-[#ffc552]`;
export const secondaryButton = `${buttonBase} border border-tc-line bg-tc-raised font-semibold text-tc-chalk hover:bg-tc-off active:bg-tc-off`;
/** Moves a request to its confirmed lamp. */
export const confirmButton = `${buttonBase} bg-tc-blue font-bold text-tc-bg hover:bg-[#a3aeff] active:bg-[#a3aeff]`;
/** Moves a request to its done lamp. */
export const doneButton = `${buttonBase} bg-tc-green font-bold text-tc-bg hover:bg-[#6ae3b1] active:bg-[#6ae3b1]`;
export const dangerButton = `${buttonBase} bg-tc-red font-bold text-tc-bg hover:bg-[#ff9285] active:bg-[#ff9285]`;
/** Low-emphasis destructive entry point (leave, close room) that opens a confirm dialog. */
export const dangerQuietButton =
  "min-h-12 rounded-btn border border-tc-line px-6 text-base font-semibold text-tc-red transition-colors hover:bg-tc-deck active:bg-tc-deck";
/** Small secondary action inside a card. */
export const compactButton =
  "min-h-11 shrink-0 rounded-btn border border-tc-line bg-tc-raised px-4 font-semibold text-tc-chalk transition-colors hover:bg-tc-off active:bg-tc-off";

/** Shared field look; pair with a surface colour and a size. */
export const fieldBase =
  "rounded-btn border border-tc-line px-4 text-tc-chalk placeholder:text-tc-dim placeholder:font-normal focus-visible:border-tc-amber focus-visible:outline-offset-0";
export const inputField = `${fieldBase} min-h-14 bg-tc-deck text-lg`;
/** Same field for use on a deck-coloured card. */
export const inputFieldOnCard = `${fieldBase} min-h-11 bg-tc-bg text-lg`;

export const panel = "rounded-2xl border border-tc-line bg-tc-deck";

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-tc-line bg-tc-deck p-6 shadow-2xl"
      >
        <h2 className="font-display text-2xl leading-snug font-bold">{title}</h2>
        {children ? <p className="text-base text-tc-muted">{children}</p> : null}
        <div className="flex gap-3">
          <button type="button" disabled={busy} onClick={onCancel} className={`${secondaryButton} flex-1`}>
            취소
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className={`${dangerButton} flex-1`}>
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
