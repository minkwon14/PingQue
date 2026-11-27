import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PhoneFrame } from "@/components/landing/PhoneFrame";
import { LANDING_CONTENT } from "@/lib/landing/content";
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

const primaryLink =
  "inline-flex min-h-14 items-center justify-center rounded-2xl bg-indigo-500 px-8 text-lg font-bold text-white hover:bg-indigo-400 active:bg-indigo-400";
const secondaryLink =
  "inline-flex min-h-14 items-center justify-center rounded-2xl bg-zinc-800 px-8 text-lg font-semibold text-zinc-100 hover:bg-zinc-700 active:bg-zinc-700";
const sectionPadding = "mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24";

function SectionHeading({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-3 text-lg text-zinc-400">{intro}</p>
    </div>
  );
}

export default async function LandingPage() {
  const lang = await currentLang();
  const t = LANDING_CONTENT[lang];

  return (
    <div lang={lang} className="flex flex-1 flex-col break-keep">
      <LandingHeader lang={lang} nav={t.nav} />

      <main className="flex-1">
        <section className={`${sectionPadding} grid items-center gap-12 pt-12 sm:pt-16 lg:grid-cols-2`}>
          <div className="flex flex-col items-start gap-6">
            <span className="rounded-full bg-indigo-500/15 px-4 py-1.5 text-sm font-semibold text-indigo-200">
              {t.hero.badge}
            </span>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {t.hero.title}
            </h1>
            <p className="max-w-xl text-lg text-zinc-400 sm:text-xl">{t.hero.subtitle}</p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/start#create" className={primaryLink}>
                {t.hero.create}
              </Link>
              <Link href="/start#join" className={secondaryLink}>
                {t.hero.join}
              </Link>
            </div>
            <p className="text-sm text-zinc-500">{t.hero.note}</p>
          </div>
          <div className="flex items-start justify-center gap-4 sm:gap-8">
            <PhoneFrame src="/landing/host.webp" alt={t.hero.hostAlt} caption={t.hero.hostCaption} priority />
            <PhoneFrame
              src="/landing/participant.webp"
              alt={t.hero.participantAlt}
              caption={t.hero.participantCaption}
              priority
              className="mt-8 sm:mt-12"
            />
          </div>
        </section>

        <section className="border-y border-zinc-800/80 bg-zinc-900/40">
          <div className={sectionPadding}>
            <SectionHeading title={t.where.title} intro={t.where.intro} />
            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {t.where.items.map((item) => (
                <li key={item.title} className="flex flex-col gap-4 rounded-3xl bg-zinc-900 p-6">
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="text-zinc-400">{item.text}</p>
                  <ul className="mt-auto flex flex-wrap gap-2">
                    {item.examples.map((example) => (
                      <li key={example} className="rounded-full bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-200">
                        {example}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-zinc-500">{t.where.extra}</p>
          </div>
        </section>

        <section id="features" className={`${sectionPadding} scroll-mt-16`}>
          <SectionHeading title={t.features.title} intro={t.features.intro} />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.items.map((item) => (
              <li key={item.title} className="rounded-3xl border border-zinc-800 p-6">
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-zinc-400">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="how" className="scroll-mt-16 border-y border-zinc-800/80 bg-zinc-900/40">
          <div className={sectionPadding}>
            <SectionHeading title={t.how.title} intro={t.how.intro} />
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {t.how.steps.map((step, index) => (
                <li key={step.title} className="flex gap-4 rounded-3xl bg-zinc-900 p-6 md:flex-col">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xl font-black">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold">{step.title}</h3>
                    <p className="mt-2 text-zinc-400">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={`${sectionPadding} flex flex-col items-center gap-6 text-center`}>
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{t.cta.title}</h2>
          <p className="max-w-xl text-lg text-zinc-400">{t.cta.text}</p>
          <Link href="/start" className={primaryLink}>
            {t.cta.button}
          </Link>
        </section>
      </main>

      <footer className="border-t border-zinc-800/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="font-bold text-zinc-300">TapCue</span> · {t.footer.tagline}
          </p>
          <p>© {new Date().getFullYear()} TapCue</p>
        </div>
      </footer>
    </div>
  );
}
