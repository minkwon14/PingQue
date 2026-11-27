"use client";

import { useState } from "react";
import { RolePicker } from "@/components/RolePicker";
import {
  compactButton,
  ConfirmDialog,
  dangerQuietButton,
  fieldBase,
  panel,
  primaryButton,
  secondaryButton,
} from "@/components/ui";
import { actionErrorMessage, api } from "@/lib/client/api";
import { deviceKey, PROFILE_KEY, writeStored } from "@/lib/client/storage";
import { NAME_MAX_LENGTH } from "@/lib/config";

export function ParticipantProfile({
  code,
  token,
  name,
  role,
  roles,
  onChanged,
}: {
  code: string;
  token: string;
  name: string;
  role: string;
  roles: string[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [roleValue, setRoleValue] = useState(role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setNameValue(name);
    setRoleValue(role);
    setError(null);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateProfile(code, token, {
        name: nameValue.trim(),
        role: roleValue.trim(),
      });
      writeStored(deviceKey(code), JSON.stringify({ token, name: updated.name, role: updated.role }));
      writeStored(PROFILE_KEY, JSON.stringify({ name: updated.name, role: updated.role }));
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(actionErrorMessage(err, "저장하지 못했어요."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">내 정보</h2>
      {editing ? (
        <form onSubmit={save} className={`${panel} flex flex-col gap-4 p-4`}>
          <label className="flex flex-col gap-2">
            <span className="text-lg font-semibold">이름</span>
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              maxLength={NAME_MAX_LENGTH}
              className={`${fieldBase} min-h-12 bg-tc-bg text-lg`}
            />
          </label>
          <RolePicker roles={roles} value={roleValue} onChange={setRoleValue} tone="card" />
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={() => setEditing(false)} className={`${secondaryButton} flex-1`}>
              취소
            </button>
            <button type="submit" disabled={busy || !nameValue.trim() || !roleValue.trim()} className={`${primaryButton} flex-1`}>
              {busy ? "저장 중…" : "저장"}
            </button>
          </div>
        </form>
      ) : (
        <div className={`${panel} flex items-center justify-between gap-3 p-4`}>
          <div className="min-w-0 truncate">
            <b>{name}</b> <span className="text-tc-muted">· {role}</span>
          </div>
          <button
            type="button"
            onClick={startEdit}
            className={`${compactButton} min-h-12`}
          >
            이름·역할 수정
          </button>
        </div>
      )}
      {error ? <p className="font-medium text-tc-red">{error}</p> : null}
    </section>
  );
}

export function LeaveRoomButton({ code, token }: { code: string; token: string }) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function leave() {
    setBusy(true);
    setError(null);
    try {
      await api.leaveRoom(code, token);
      writeStored(deviceKey(code), null);
    } catch (err) {
      setConfirmLeave(false);
      setError(actionErrorMessage(err, "나가지 못했어요."));
      setBusy(false);
    }
  }

  return (
    <>
      {error ? <p className="font-medium text-tc-red">{error}</p> : null}
      <button
        type="button"
        onClick={() => setConfirmLeave(true)}
        className={dangerQuietButton}
      >
        나가기
      </button>
      {confirmLeave ? (
        <ConfirmDialog
          title="방에서 나갈까요?"
          confirmLabel="나가기"
          busy={busy}
          onConfirm={() => void leave()}
          onCancel={() => setConfirmLeave(false)}
        >
          보낸 요청 중 처리되지 않은 요청은 자동으로 취소돼요.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
