import type { Metadata } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { AmbientBackground } from "../components/ui/ambient-background";
import "./tokens.css";
import "./globals.css";
import "./friendly-playful.css";
import "./auth-welcome.css";
import "./a5.css";
import { I18nProvider } from "../i18n/client";
import { getLocale, getT } from "../i18n/server";

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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
  icons: {
    icon: [{ url: "/images/brand/favicon.png", type: "image/png" }],
    shortcut: "/images/brand/favicon.png",
    apple: "/images/brand/favicon.png",
  },
  title: t("Speakora — Luyện nói tiếng Anh"),
  description: t("Phiên luyện nói tiếng Anh có hướng dẫn, ghi âm và phản hồi nhanh."),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${fraunces.variable} ${workSans.variable}`}>
      <body><I18nProvider locale={locale}><AmbientBackground />{children}</I18nProvider></body>
    </html>
  );
}
