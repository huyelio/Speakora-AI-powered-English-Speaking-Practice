import React from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, Headphones, Mic2, PenLine } from "lucide-react";
import type { EnglishSkill, EnglishSkillKey } from "../../modules/profile/english-skills";

const skillIcons = {
  listening: Headphones,
  speaking: Mic2,
  reading: BookOpenText,
  writing: PenLine,
} satisfies Record<EnglishSkillKey, typeof Headphones>;

export function EnglishSkills({
  skills,
  unavailable = false,
  timezone = "Asia/Ho_Chi_Minh",
}: {
  skills: EnglishSkill[];
  unavailable?: boolean;
  timezone?: string;
}) {
  return (
    <section className="english-skills-section" aria-labelledby="english-skills-heading">
      <div className="section-heading-row english-skills-heading">
        <div>
          <p className="eyebrow">YOUR CURRENT LEVEL</p>
          <h2 id="english-skills-heading">English Skills</h2>
        </div>
        <p>Chỉ hiển thị kết quả từ những bài đánh giá bạn đã hoàn thành.</p>
      </div>
      <div className="english-skills-grid">
        {skills.map((skill) => {
          const Icon = skillIcons[skill.key];
          const assessed = !unavailable && skill.status === "ASSESSED";
          return (
            <article className={`english-skill-card${assessed ? " is-assessed" : ""}`} key={skill.key}>
              <div className="english-skill-card-heading">
                <span className="english-skill-icon"><Icon size={22} aria-hidden="true" /></span>
                <span className={`english-skill-status${assessed ? " is-assessed" : ""}`}>
                  {unavailable ? "Unavailable" : assessed ? "Assessed" : "Not assessed"}
                </span>
              </div>
              <h3>{skill.label}</h3>
              {unavailable ? (
                <p className="english-skill-empty">Không thể tải dữ liệu đánh giá lúc này.</p>
              ) : assessed ? (
                <>
                  <div className="english-skill-result" aria-label={`${skill.label}: ${skill.value}, ${skill.scale}`}>
                    <strong>{skill.value}</strong>
                    <span>{skill.scale}</span>
                  </div>
                  <p className="english-skill-meta">
                    {skill.source} · {new Date(skill.assessedAt).toLocaleDateString("vi-VN", { timeZone: timezone })}
                  </p>
                  <Link href={`/history/${skill.sessionId}`}>Xem kết quả <ArrowUpRight size={16} aria-hidden="true" /></Link>
                </>
              ) : (
                <p className="english-skill-empty">Chưa có bài đánh giá cho kỹ năng này.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
