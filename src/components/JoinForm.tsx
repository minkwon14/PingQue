"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RolePicker } from "@/components/RolePicker";
import { inputField, linkClass, Notice, primaryButton } from "@/components/ui";
import { api, ApiError } from "@/lib/client/api";
import {
  deviceKey,
  parseDevice,
  PROFILE_KEY,
  useStoredValue,
  writeStored,
} from "@/lib/client/storage";
import { getTemplate } from "@/lib/domain/templates";
import type { PublicRoom } from "@/lib/domain/types";
import { NAME_MAX_LENGTH } from "@/lib/config";

type Load =
  | { state: "loading" }
  | { state: "ready"; room: PublicRoom }
  | { state: "error"; error: ApiError };

export function JoinForm({ code }: { code: string }) {
  const router = useRouter();
  const storedDevice = useStoredValue(deviceKey(code));
  const storedProfile = useStoredValue(PROFILE_KEY);
  const device = useMemo(() => parseDevice(storedDevice), [storedDevice]);
  const profile = useMemo(() => {
    try {
      return storedProfile ? (JSON.parse(storedProfile) as { name?: string; role?: string }) : {};
    } catch {
      return {};
    }
  }, [storedProfile]);

  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [name, setName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (device) router.replace(`/r/${code}`);
  }, [device, code, router]);

  useEffect(() => {
    let cancelled = false;
    api
      .getPublicRoom(code)
      .then((room) => !cancelled && setLoad({ state: "ready", room }))
      .catch((e) => {
        if (cancelled) return;
        setLoad({
          state: "error",
          error: e instanceof ApiError ? e : new ApiError("unknown", 0, "불러오지 못했어요."),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (device || storedDevice === undefined) {
    return <Notice title="입장 중…" />;
  }

  if (load.state === "loading") return <Notice title="방을 확인하는 중…" />;

  if (load.state === "error") {
    const { error: err } = load;
    const title =
      err.code === "room_expired" || err.code === "room_closed"
        ? "방이 종료되었어요"
        : err.code === "not_found"
          ? "방을 찾을 수 없어요"
          : err.code === "rate_limited"
            ? "잠시 후 다시 시도해 주세요"
            : "연결할 수 없어요";
    return (
      <Notice
        title={title}
        action={
          <Link href="/start" className={linkClass}>
            처음으로
          </Link>
        }
      >
        {err.code === "not_found" ? `코드 ${code} 를 다시 확인해 주세요.` : err.message}
      </Notice>
    );
  }

  const { room } = load;
  const template = getTemplate(room.templateId);
  if (!template) return <Notice title="알 수 없는 방이에요" />;
  const full = room.participantCount >= room.maxParticipants;

  const nameValue = name ?? profile.name ?? "";
  const roleValue = role ?? profile.role ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleValue.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.join(code, { name: nameValue.trim(), role: roleValue.trim() });
      writeStored(
        deviceKey(code),
        JSON.stringify({ token: result.token, name: result.participant.name, role: result.participant.role }),
      );
      writeStored(PROFILE_KEY, JSON.stringify({ name: result.participant.name, role: result.participant.role }));
      router.replace(`/r/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "참여하지 못했어요.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 pb-12 pt-10">
      <header className="flex flex-col gap-1">
        <p className="text-base text-tc-muted">{template.name}</p>
        <h1 className="font-display text-3xl leading-snug font-bold">
          방 <span className="font-mono tracking-widest text-tc-amber">{code}</span> 참여
        </h1>
        <p className="text-base text-tc-muted">
          {room.participantCount}/{room.maxParticipants}명 참여 중
        </p>
      </header>

      {full ? (
        <p className="rounded-2xl border border-tc-red bg-tc-red/15 p-4 text-lg font-medium text-tc-red">방이 가득 찼어요.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-7">
          <label className="flex flex-col gap-2">
            <span className="text-lg font-semibold">이름</span>
            <input
              value={nameValue}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX_LENGTH}
              placeholder="예: 민"
              autoComplete="given-name"
              className={inputField}
            />
          </label>

          <RolePicker roles={room.roles} value={roleValue} onChange={setRole} />

          <button
            type="submit"
            className={primaryButton}
            disabled={busy || !nameValue.trim() || !roleValue.trim()}
          >
            {busy ? "참여 중…" : "참여하기"}
          </button>
          {error ? <p className="font-medium text-tc-red">{error}</p> : null}
        </form>
      )}
    </main>
  );
}
