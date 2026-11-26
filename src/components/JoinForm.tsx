"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Notice, primaryButton } from "@/components/ui";
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
      err.code === "room_expired"
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
          <Link href="/" className="text-indigo-300 underline">
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
  const roleValue = role ?? (profile.role && template.roles.includes(profile.role) ? profile.role : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleValue) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.join(code, { name: nameValue.trim(), role: roleValue });
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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6 pt-10">
      <header>
        <p className="text-sm text-zinc-500">{template.name}</p>
        <h1 className="text-3xl font-black">방 {code} 참여</h1>
        <p className="mt-1 text-zinc-400">
          {room.participantCount}/{room.maxParticipants}명 참여 중
        </p>
      </header>

      {full ? (
        <p className="rounded-2xl bg-red-500/15 p-4 text-red-200">방이 가득 찼어요.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="font-semibold">이름</span>
            <input
              value={nameValue}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX_LENGTH}
              placeholder="예: 민"
              autoComplete="given-name"
              className="min-h-14 rounded-2xl border-2 border-zinc-800 bg-zinc-900 px-4 text-xl"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-semibold">역할</legend>
            <div className="grid grid-cols-2 gap-3">
              {template.roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={roleValue === r}
                  onClick={() => setRole(r)}
                  className={`min-h-14 rounded-2xl border-2 px-3 text-lg font-semibold ${
                    roleValue === r
                      ? "border-indigo-400 bg-indigo-500/20"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className={primaryButton}
            disabled={busy || !nameValue.trim() || !roleValue}
          >
            {busy ? "참여 중…" : "참여하기"}
          </button>
          {error ? <p className="text-red-400">{error}</p> : null}
        </form>
      )}
    </main>
  );
}
