"use client";

import { useState } from "react";
import { ROLE_MAX_LENGTH } from "@/lib/config";

/** Role choices from the room plus a free-text field; `value` is whichever was picked or typed last. */
export function RolePicker({
  roles,
  value,
  onChange,
  tone = "page",
}: {
  roles: string[];
  value: string;
  onChange: (role: string) => void;
  tone?: "page" | "card";
}) {
  const surface = tone === "page" ? "bg-zinc-900" : "bg-zinc-950";
  const size = tone === "page" ? "min-h-14 text-lg" : "min-h-12";
  const [custom, setCustom] = useState(roles.includes(value) ? "" : value);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">역할</legend>
      {roles.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={!custom && value === r}
              onClick={() => {
                setCustom("");
                onChange(r);
              }}
              className={`${size} rounded-2xl border-2 px-3 font-semibold ${
                !custom && value === r ? "border-indigo-400 bg-indigo-500/20" : `border-zinc-800 ${surface}`
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      ) : null}
      <input
        value={custom}
        onChange={(e) => {
          setCustom(e.target.value);
          onChange(e.target.value);
        }}
        maxLength={ROLE_MAX_LENGTH}
        placeholder="직접 입력"
        aria-label="역할 직접 입력"
        className={`${size} rounded-2xl border-2 bg-transparent px-4 ${
          custom ? "border-indigo-400" : "border-zinc-800"
        } ${surface}`}
      />
    </fieldset>
  );
}
