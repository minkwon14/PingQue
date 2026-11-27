"use client";

import { useState } from "react";
import { fieldBase } from "@/components/ui";
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
  const surface = tone === "page" ? "bg-tc-deck" : "bg-tc-bg";
  const size = tone === "page" ? "min-h-14 text-lg" : "min-h-12";
  const [custom, setCustom] = useState(roles.includes(value) ? "" : value);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-lg font-semibold">역할</legend>
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
              className={`${size} rounded-btn border-2 px-3 font-semibold transition-colors ${
                !custom && value === r
                  ? "border-tc-amber bg-tc-amber/10 text-tc-amber"
                  : `border-tc-line ${surface} hover:bg-tc-raised`
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
        className={`${fieldBase} ${size} border-2 ${surface} ${custom ? "border-tc-amber" : ""}`}
      />
    </fieldset>
  );
}
