import { describe, expect, it } from "vitest";
import { langFromAcceptLanguage, resolveLang } from "./lang";

describe("langFromAcceptLanguage", () => {
  it("picks Korean when it is the top preference", () => {
    expect(langFromAcceptLanguage("ko-KR,ko;q=0.9,en-US;q=0.8")).toBe("ko");
    expect(langFromAcceptLanguage("ko")).toBe("ko");
    expect(langFromAcceptLanguage("en;q=0.5, ko;q=0.9")).toBe("ko");
  });

  it("falls back to English otherwise", () => {
    expect(langFromAcceptLanguage("en-US,en;q=0.9,ko;q=0.8")).toBe("en");
    expect(langFromAcceptLanguage("ja,fr;q=0.5")).toBe("en");
    expect(langFromAcceptLanguage("*")).toBe("en");
    expect(langFromAcceptLanguage("")).toBe("en");
    expect(langFromAcceptLanguage(null)).toBe("en");
  });

  it("ignores languages that merely contain 'ko'", () => {
    expect(langFromAcceptLanguage("kok-IN")).toBe("en");
  });
});

describe("resolveLang", () => {
  it("prefers a valid cookie over the header", () => {
    expect(resolveLang("en", "ko-KR")).toBe("en");
    expect(resolveLang("ko", "en-US")).toBe("ko");
  });

  it("ignores an invalid cookie", () => {
    expect(resolveLang("fr", "ko-KR")).toBe("ko");
    expect(resolveLang(undefined, "en-US")).toBe("en");
  });
});
