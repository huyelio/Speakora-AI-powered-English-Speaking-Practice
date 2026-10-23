import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AmbientBackground } from "../components/ui/ambient-background";
import "./globals.css";
import "./friendly-playful.css";
import "./auth-welcome.css";

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
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t;try{t=localStorage.getItem('speakora-theme')}catch(e){}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')})()` }} />
      </head>
      <body><AmbientBackground />{children}</body>
    </html>
  );
}
