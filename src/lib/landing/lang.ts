export type Lang = "ko" | "en";

export const LANG_COOKIE = "tapcue-lang";

export function isLang(value: string | null | undefined): value is Lang {
  return value === "ko" || value === "en";
}

/** Korean only if the browser's most preferred language is Korean; everything else gets English. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  const best = (header ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const weight = q ? Number(q.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), weight: Number.isNaN(weight) ? 0 : weight, index };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index)[0];
  return best && (best.tag === "ko" || best.tag.startsWith("ko-")) ? "ko" : "en";
}

export function resolveLang(cookie: string | undefined, acceptLanguage: string | null | undefined): Lang {
  return isLang(cookie) ? cookie : langFromAcceptLanguage(acceptLanguage);
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Browser only: remember the visitor's choice for the next server render. */
export function writeLangCookie(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
