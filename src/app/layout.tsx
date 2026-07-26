import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Speakora — Luyện nói tiếng Anh",
  description: "Phiên luyện nói tiếng Anh có hướng dẫn, ghi âm và phản hồi nhanh.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
