"use client";

import React from "react";
import Link from "next/link";
import { AudioLines, BookOpen, Languages, MessageCircle, ArrowUpRight } from "lucide-react";
import type { SkillReview } from "../../modules/profile/skill-review";
import { useLocale, useT } from "../../i18n/client";
import { intlLocale } from "../../i18n/config";

export function SkillOverview({ review, unavailable = false, timezone = "Asia/Ho_Chi_Minh" }: { review: SkillReview | null; unavailable?: boolean; timezone?: string }) {
  const t = useT();
  const locale = useLocale();
  const result = review?.result;
  const empty = unavailable ? t("Chưa tải được nhận xét. Bạn có thể thử tải lại trang.") : t("Hoàn thành một phiên giao tiếp để nhận đánh giá.");
  const skills = [
    { name: t("Từ vựng"), Icon: BookOpen, text: result?.criteria?.lexicalResource.summary, href: "/vocabulary", action: t("Ôn từ vựng") },
    { name: t("Ngữ pháp"), Icon: Languages, text: result?.criteria?.grammaticalRangeAccuracy.summary, href: "/speaking?tab=topics", action: t("Luyện trong ngữ cảnh") },
    { name: t("Độ trôi chảy"), Icon: MessageCircle, text: result?.criteria?.fluencyCoherence.summary, href: "/speaking?tab=topics", action: t("Luyện giao tiếp") },
    { name: t("Phát âm"), Icon: AudioLines, text: result?.pronunciation.available ? result.pronunciation.summary : result ? t("Phiên gần nhất chưa có phân tích phát âm từ audio.") : undefined, href: "/vocabulary", action: t("Luyện phát âm") },
  ];
  return (
    <section className="skill-overview" aria-labelledby="skills-heading">
      <div className="section-heading-row">
        <div><h2 id="skills-heading">{t("Đánh giá kỹ năng")}</h2></div>
        {review && <Link href={`/history/${review.sessionId}`}>{t("Xem phiên gần nhất")} <ArrowUpRight size={16} aria-hidden="true" /></Link>}
      </div>
      {review && <p className="skills-caption">{t("Nhận xét từ phiên giao tiếp ngày {0}", new Date(review.completedAt).toLocaleDateString(intlLocale(locale), { timeZone: timezone }))}</p>}
      <div className="skills-grid">
        {skills.map(({ name, Icon, text, href, action }, index) => (
          <article className={`skill-card skill-${index}`} key={name}>
            <div className="skill-card-heading"><span className="skill-icon"><Icon size={23} aria-hidden="true" /></span><span className="skill-state">{unavailable ? t("Chưa tải được") : text ? t("Nhận xét gần nhất") : t("Chưa có đánh giá")}</span></div>
            <h3>{name}</h3>
            <p>{text || empty}</p>
            {name === t("Phát âm") && result?.pronunciation.practiceWords.length ? <div className="skill-words">{result.pronunciation.practiceWords.map(word => <span key={word} lang="en">{word}</span>)}</div> : null}
            <Link href={href}>{action}<ArrowUpRight size={16} aria-hidden="true" /></Link>
          </article>
        ))}
      </div>
    </section>
  );
}
