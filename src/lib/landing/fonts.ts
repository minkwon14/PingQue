import { Hahmlet, IBM_Plex_Sans_KR } from "next/font/google";

// Both families ship Hangul and Latin. Scoped to the landing page so the in-room app keeps its system fonts.
// preload is off because Google splits Hangul into ~100 numbered slices that next/font would all preload;
// without it the browser fetches only the slices the page actually uses.
export const displayFont = Hahmlet({
  subsets: ["latin"],
  variable: "--font-tc-display",
  display: "swap",
  preload: false,
});

export const bodyFont = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-tc-body",
  display: "swap",
  preload: false,
});
