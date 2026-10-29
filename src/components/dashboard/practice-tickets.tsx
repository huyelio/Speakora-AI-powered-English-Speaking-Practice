import Link from "next/link";
import React from "react";
import { Coffee, GraduationCap, Layers, Mic, type LucideIcon } from "lucide-react";

type Ticket = { href: string; title: string; detail: string; Icon: LucideIcon; tone: string };

export const practiceTickets: readonly Ticket[] = [
  { href: "/vocabulary", title: "Học từ vựng", detail: "Chọn chủ đề, học và phát âm 6 từ mỗi phiên.", Icon: Layers, tone: "mustard" },
  { href: "/speaking", title: "Nói theo chủ đề", detail: "Trả lời 5 câu hỏi, nhận nhận xét từ AI.", Icon: Mic, tone: "teal" },
  { href: "/conversation", title: "Hội thoại AI", detail: "Đóng vai trong tình huống đời thường.", Icon: Coffee, tone: "rose" },
  { href: "/ielts", title: "Luyện thi IELTS", detail: "Thi thử Speaking, nhận band ước tính.", Icon: GraduationCap, tone: "orange" },
];

/** Secondary entries on the home page, styled as tear-off tickets. */
export function PracticeTickets() {
  return (
    <div className="a5-tickets">
      {practiceTickets.map(({ href, title, detail, Icon, tone }) => (
        <Link className="a5-ticket" data-tone={tone} href={href} key={href}>
          <span className="a5-ticket-icon" aria-hidden="true"><Icon size={20} /></span>
          <strong>{title}</strong>
          <small>{detail}</small>
        </Link>
      ))}
    </div>
  );
}
