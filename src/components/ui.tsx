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
