"use client";

import { useRouter } from "next/navigation";
import { type Lang, writeLangCookie } from "@/lib/landing/lang";

const OPTIONS: { lang: Lang; label: string; name: string }[] = [
  { lang: "ko", label: "한", name: "한국어" },
  { lang: "en", label: "EN", name: "English" },
];

export function LanguageToggle({ lang }: { lang: Lang }) {
  const router = useRouter();

  function choose(next: Lang) {
    if (next === lang) return;
    writeLangCookie(next);
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex rounded-full border border-(--tc-line) p-0.5 text-sm font-semibold"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.lang}
          type="button"
          lang={option.lang}
          aria-label={option.name}
          aria-pressed={lang === option.lang}
          onClick={() => choose(option.lang)}
          className={`min-h-9 min-w-10 rounded-full px-3 transition-colors ${
            lang === option.lang
              ? "bg-(--tc-chalk) text-[#0c1a20]"
              : "text-(--tc-muted) hover:text-(--tc-chalk)"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
