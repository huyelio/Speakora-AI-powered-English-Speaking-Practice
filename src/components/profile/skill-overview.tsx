import React from "react";
import Link from "next/link";
import { AudioLines, BookOpen, Languages, MessageCircle, ArrowUpRight } from "lucide-react";
import type { SkillReview } from "../../modules/profile/skill-review";

export function SkillOverview({ review, unavailable = false, timezone = "Asia/Ho_Chi_Minh" }: { review: SkillReview | null; unavailable?: boolean; timezone?: string }) {
  const result = review?.result;
  const empty = unavailable ? "Chưa tải được nhận xét. Bạn có thể thử tải lại trang." : "Hoàn thành một phiên giao tiếp để nhận đánh giá.";
  const skills = [
    { name: "Từ vựng", Icon: BookOpen, text: result?.criteria?.lexicalResource.summary, href: "/vocabulary", action: "Ôn từ vựng" },
    { name: "Ngữ pháp", Icon: Languages, text: result?.criteria?.grammaticalRangeAccuracy.summary, href: "/explore", action: "Luyện trong ngữ cảnh" },
    { name: "Độ trôi chảy", Icon: MessageCircle, text: result?.criteria?.fluencyCoherence.summary, href: "/explore", action: "Luyện giao tiếp" },
    { name: "Phát âm", Icon: AudioLines, text: result?.pronunciation.available ? result.pronunciation.summary : result ? "Phiên gần nhất chưa có phân tích phát âm từ audio." : undefined, href: "/vocabulary?mode=pronounce", action: "Luyện phát âm" },
  ];
  return (
    <section className="skill-overview" aria-labelledby="skills-heading">
      <div className="section-heading-row">
        <div><h2 id="skills-heading">Đánh giá kỹ năng</h2></div>
        {review && <Link href={`/history/${review.sessionId}`}>Xem phiên gần nhất <ArrowUpRight size={16} aria-hidden="true" /></Link>}
      </div>
      {review && <p className="skills-caption">{`Nhận xét từ phiên giao tiếp ngày ${new Date(review.completedAt).toLocaleDateString("vi-VN", { timeZone: timezone })}`}</p>}
      <div className="skills-grid">
        {skills.map(({ name, Icon, text, href, action }, index) => (
          <article className={`skill-card skill-${index}`} key={name}>
            <div className="skill-card-heading"><span className="skill-icon"><Icon size={23} aria-hidden="true" /></span><span className="skill-state">{unavailable ? "Chưa tải được" : text ? "Nhận xét gần nhất" : "Chưa có đánh giá"}</span></div>
            <h3>{name}</h3>
            <p>{text || empty}</p>
            {name === "Phát âm" && result?.pronunciation.practiceWords.length ? <div className="skill-words">{result.pronunciation.practiceWords.map(word => <span key={word} lang="en">{word}</span>)}</div> : null}
            <Link href={href}>{action}<ArrowUpRight size={16} aria-hidden="true" /></Link>
          </article>
        ))}
      </div>
    </section>
  );
}
