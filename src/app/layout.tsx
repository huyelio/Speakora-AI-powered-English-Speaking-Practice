import type { Metadata } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { AmbientBackground } from "../components/ui/ambient-background";
import "./tokens.css";
import "./globals.css";
import "./friendly-playful.css";
import "./auth-welcome.css";
import "./a5.css";

// Vietnamese subsets are required for stacked diacritics (ệ, ồ, ữ…).
const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  axes: ["SOFT", "WONK", "opsz"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-fraunces",
});
const workSans = Work_Sans({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-work-sans",
});

export const metadata: Metadata = {
  icons: {
    icon: [{ url: "/images/brand/favicon.png", type: "image/png" }],
    shortcut: "/images/brand/favicon.png",
    apple: "/images/brand/favicon.png",
  },
  title: "Speakora — Luyện nói tiếng Anh",
  description: "Phiên luyện nói tiếng Anh có hướng dẫn, ghi âm và phản hồi nhanh.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" className={`${fraunces.variable} ${workSans.variable}`}>
      <body><AmbientBackground />{children}</body>
    </html>
  );
}
