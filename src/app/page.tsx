import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import "./landing.css";
import { CueLamps } from "@/components/landing/CueLamps";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PhoneFrame, TabletFrame } from "@/components/landing/DeviceFrames";
import { LANDING_CONTENT } from "@/lib/landing/content";
import { bodyFont, displayFont } from "@/lib/landing/fonts";
import { LANG_COOKIE, resolveLang } from "@/lib/landing/lang";

async function currentLang() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLang(cookieStore.get(LANG_COOKIE)?.value, headerStore.get("accept-language"));
}

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = LANDING_CONTENT[await currentLang()];
  return {
    title: meta.title,
    description: meta.description,
    openGraph: { title: meta.title, description: meta.description, type: "website" },
  };
}

const wrap = "mx-auto w-full max-w-7xl px-4 sm:px-8";
const sectionY = "py-20 sm:py-28";

export default async function LandingPage() {
  const lang = await currentLang();
  const t = LANDING_CONTENT[lang];

  return (
    <div
      lang={lang}
      className={`tc-root ${displayFont.variable} ${bodyFont.variable} flex flex-1 flex-col break-keep`}
    >
      <LandingHeader lang={lang} nav={t.nav} />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="tc-wash pointer-events-none absolute inset-0" />
          <div
            className={`${wrap} relative grid grid-cols-1 items-center gap-14 pb-20 pt-12 sm:pb-28 sm:pt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12 xl:gap-20`}
          >
            <div className="flex flex-col items-start gap-6">
              <p className="tc-body text-base font-medium text-(--tc-amber)">{t.hero.badge}</p>
              <h1 className="tc-display text-[2.25rem] sm:text-6xl lg:text-5xl xl:text-[3.5rem]">{t.hero.title}</h1>
              <p className="tc-body max-w-xl text-lg text-(--tc-muted) sm:text-xl">{t.hero.subtitle}</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link href="/start#create" className="tc-btn tc-btn-lamp">
                  {t.hero.create}
                </Link>
                <Link href="/start#join" className="tc-btn tc-btn-quiet">
                  {t.hero.join}
                </Link>
              </div>
              <p className="tc-body text-sm text-(--tc-muted)">{t.hero.note}</p>
              <div className="mt-4 border-t border-(--tc-line) pt-6">
                <CueLamps labels={t.hero.lamps} sequence />
              </div>
            </div>
            <figure className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
              <div className="relative pb-16 sm:pb-24">
                <div className="w-[90%]">
                  <TabletFrame src={`/landing/host-${lang}.webp`} alt={t.hero.hostAlt} priority />
                </div>
                <PhoneFrame
                  src={`/landing/participant-${lang}.webp`}
                  alt={t.hero.participantAlt}
                  priority
                  className="absolute bottom-0 right-0 w-[32%] sm:w-[28%]"
                />
              </div>
              <figcaption className="tc-body flex flex-wrap gap-x-8 gap-y-1 text-sm text-(--tc-muted)">
                <span>{t.hero.hostCaption}</span>
                <span>{t.hero.participantCaption}</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="border-y border-(--tc-line)/70 bg-(--tc-deck)/80">
          <div className={`${wrap} ${sectionY}`}>
            <div className="max-w-2xl">
              <h2 className="tc-display text-3xl sm:text-5xl">{t.where.title}</h2>
              <p className="tc-body mt-4 text-lg text-(--tc-muted)">{t.where.intro}</p>
            </div>
            <ul className="mt-12 border-b border-(--tc-line)">
              {t.where.items.map((item) => (
                <li
                  key={item.title}
                  className="grid gap-5 border-t border-(--tc-line) py-9 lg:grid-cols-12 lg:items-start lg:gap-10"
                >
                  <h3 className="tc-display text-2xl sm:text-3xl lg:col-span-4">{item.title}</h3>
                  <p className="tc-body text-lg text-(--tc-muted) lg:col-span-4">{item.text}</p>
                  <ul className="flex flex-wrap gap-3 lg:col-span-4 lg:justify-end">
                    {item.examples.map((example) => (
                      <li
                        key={example}
                        className="flex items-center gap-2.5 rounded-2xl border border-(--tc-line) bg-(--tc-deck-raised) px-4 py-3 font-semibold"
                      >
                        <span aria-hidden="true" className="size-2 rounded-full bg-(--tc-amber)" />
                        {example}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="tc-body mt-8 text-lg text-(--tc-muted)">{t.where.extra}</p>
          </div>
        </section>

        <section id="features" className="scroll-mt-28 md:scroll-mt-20">
          <div className={`${wrap} ${sectionY} grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16`}>
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <h2 className="tc-display text-3xl sm:text-5xl">{t.features.title}</h2>
                <p className="tc-body mt-4 text-lg text-(--tc-muted)">{t.features.intro}</p>
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:col-span-8">
              {t.features.items.map((item, index) => (
                <li
                  key={item.title}
                  className={`border-t border-(--tc-line) pt-6 ${index === 0 ? "sm:col-span-2" : ""}`}
                >
                  <h3 className={`tc-display ${index === 0 ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"}`}>
                    {item.title}
                  </h3>
                  <p className="tc-body mt-3 text-(--tc-muted)">{item.text}</p>
                  {index === 0 && (
                    <div className="mt-6">
                      <CueLamps labels={t.hero.lamps} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how" className="scroll-mt-28 border-y border-(--tc-line)/70 bg-(--tc-deck)/80 md:scroll-mt-20">
          <div className={`${wrap} ${sectionY}`}>
            <div className="max-w-2xl">
              <h2 className="tc-display text-3xl sm:text-5xl">{t.how.title}</h2>
              <p className="tc-body mt-4 text-lg text-(--tc-muted)">{t.how.intro}</p>
            </div>
            <ol className="mt-14 grid md:grid-cols-3 md:gap-10">
              {t.how.steps.map((step, index) => (
                <li
                  key={step.title}
                  className="group relative grid grid-cols-[2.75rem_1fr] gap-x-5 pb-10 last:pb-0 md:block md:border-t md:border-(--tc-line) md:pb-0 md:pt-8"
                >
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1 left-[1.375rem] top-16 w-px bg-(--tc-line) group-last:hidden md:hidden"
                  />
                  <span className="tc-display text-center text-5xl leading-none! md:text-left md:text-7xl">{index + 1}</span>
                  <div className="md:mt-6">
                    <h3 className="tc-display text-xl sm:text-2xl">{step.title}</h3>
                    <p className="tc-body mt-3 text-(--tc-muted)">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${wrap} py-16 sm:py-24`}>
          <div className="relative overflow-hidden rounded-[2rem] bg-(--tc-amber) px-6 py-14 text-[#1a1204] sm:px-14 sm:py-20">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_50%_0%,rgb(255_255_255/0.35),transparent_70%)]"
            />
            <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="tc-display text-4xl sm:text-6xl">{t.cta.title}</h2>
                <p className="tc-body mt-4 text-lg font-medium sm:text-xl">{t.cta.text}</p>
              </div>
              <Link href="/start" className="tc-btn tc-btn-ink w-full sm:w-auto">
                {t.cta.button}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-(--tc-line)/70">
        <div
          className={`${wrap} tc-body flex flex-col gap-2 py-8 text-sm text-(--tc-muted) sm:flex-row sm:items-center sm:justify-between`}
        >
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="tc-display text-lg text-(--tc-chalk)">TapCue</span>
            <span>{t.footer.tagline}</span>
          </p>
          <p>© {new Date().getFullYear()} TapCue</p>
        </div>
      </footer>
    </div>
  );
}
