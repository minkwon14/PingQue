import Link from "next/link";
import { LanguageToggle } from "@/components/landing/LanguageToggle";
import type { LandingContent } from "@/lib/landing/content";
import type { Lang } from "@/lib/landing/lang";

const navLink =
  "rounded-md px-1 py-2 font-medium text-(--tc-muted) underline-offset-8 transition-colors hover:text-(--tc-chalk) hover:underline";

export function LandingHeader({ lang, nav }: { lang: Lang; nav: LandingContent["nav"] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-(--tc-line)/70 bg-(--tc-bg)/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="size-3 rounded-full bg-(--tc-amber) shadow-[0_0_14px_2px_rgb(255_182_46/0.55)]"
          />
          <span className="tc-display text-2xl">TapCue</span>
        </Link>
        <nav aria-label={nav.menu} className="hidden items-center gap-8 md:flex">
          <a href="#features" className={navLink}>
            {nav.features}
          </a>
          <a href="#how" className={navLink}>
            {nav.how}
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageToggle lang={lang} />
          <Link href="/start" className="tc-btn tc-btn-lamp !min-h-10 !rounded-full !px-4 !text-base">
            {nav.start}
          </Link>
        </div>
      </div>
      <nav
        aria-label={nav.menu}
        className="mx-auto flex h-10 max-w-7xl items-center gap-6 border-t border-(--tc-line)/50 px-4 text-sm md:hidden"
      >
        <a href="#features" className={navLink}>
          {nav.features}
        </a>
        <a href="#how" className={navLink}>
          {nav.how}
        </a>
      </nav>
    </header>
  );
}
