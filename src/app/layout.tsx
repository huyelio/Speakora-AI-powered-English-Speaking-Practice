import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Speakora — Luyện nói tiếng Anh",
  description: "Phiên luyện nói tiếng Anh có hướng dẫn, ghi âm và phản hồi nhanh.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t;try{t=localStorage.getItem('speakora-theme')}catch(e){}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')})()` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
