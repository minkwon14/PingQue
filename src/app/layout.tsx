import type { Metadata, Viewport } from "next";
import "./globals.css";
import { bodyFont, displayFont } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "TapCue",
  description: "터치 한 번으로 보내는 현장 실시간 신호",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c1a20",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
