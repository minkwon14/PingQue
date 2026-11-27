import Link from "next/link";
import { LanguageToggle } from "@/components/landing/LanguageToggle";
import type { LandingContent } from "@/lib/landing/content";
import type { Lang } from "@/lib/landing/lang";

export function LandingHeader({ lang, nav }: { lang: Lang; nav: LandingContent["nav"] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="text-2xl font-black tracking-tight">
          TapCue
        </Link>
        <nav aria-label={nav.menu} className="hidden items-center gap-8 text-zinc-300 md:flex">
          <a href="#features" className="hover:text-white">
            {nav.features}
          </a>
          <a href="#how" className="hover:text-white">
            {nav.how}
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle lang={lang} />
          <Link
            href="/start"
            className="inline-flex min-h-10 items-center rounded-full bg-indigo-500 px-4 font-bold text-white hover:bg-indigo-400 active:bg-indigo-400"
          >
            {nav.start}
          </Link>
        </div>
      </div>
    </header>
  );
}
