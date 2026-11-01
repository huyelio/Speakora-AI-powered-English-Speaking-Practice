"use client";

import Link from "next/link";
import React from "react";
import { Coffee, GraduationCap, Layers, Mic, type LucideIcon } from "lucide-react";
import { useT } from "../../i18n/client";
import { msg } from "../../i18n/translate";

type Ticket = { href: string; title: string; detail: string; Icon: LucideIcon; tone: string };

export const practiceTickets: readonly Ticket[] = [
  { href: "/vocabulary", title: msg("Học từ vựng"), detail: msg("Chọn chủ đề, học và phát âm 6 từ mỗi phiên."), Icon: Layers, tone: "mustard" },
  { href: "/speaking", title: msg("Nói theo chủ đề"), detail: msg("Trả lời 5 câu hỏi, nhận nhận xét từ AI."), Icon: Mic, tone: "teal" },
  { href: "/conversation", title: msg("Hội thoại AI"), detail: msg("Đóng vai trong tình huống đời thường."), Icon: Coffee, tone: "rose" },
  { href: "/ielts", title: msg("Luyện thi IELTS"), detail: msg("Thi thử Speaking, nhận band ước tính."), Icon: GraduationCap, tone: "orange" },
];

/** Secondary entries on the home page, styled as tear-off tickets. */
export function PracticeTickets() {
  const t = useT();
  return (
    <div className="a5-tickets">
      {practiceTickets.map(({ href, title, detail, Icon, tone }) => (
        <Link className="a5-ticket" data-tone={tone} href={href} key={href}>
          <span className="a5-ticket-icon" aria-hidden="true"><Icon size={20} /></span>
          <strong>{t.dynamic(title)}</strong>
          <small>{t.dynamic(detail)}</small>
        </Link>
      ))}
    </div>
  );
}
