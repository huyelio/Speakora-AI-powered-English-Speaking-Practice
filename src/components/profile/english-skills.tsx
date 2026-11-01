"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { EnglishSkill } from "../../modules/profile/english-skills";
import {
  normalizeEnglishSkillsForRadar,
  type EnglishSkillRadarDatum,
} from "../../modules/profile/english-skills-visualization";
import { useLocale, useT } from "../../i18n/client";
import { intlLocale } from "../../i18n/config";

const center = 200;
const radius = 108;
const axisVectors = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
] as const;

function polygonPoints(scale: number) {
  return axisVectors
    .map(({ x, y }) => `${center + x * radius * scale},${center + y * radius * scale}`)
    .join(" ");
}

function dataPoints(skills: EnglishSkillRadarDatum[]) {
  return skills
    .map((skill, index) => {
      const vector = axisVectors[index];
      const scale = skill.plotValue / 100;
      return `${center + vector.x * radius * scale},${center + vector.y * radius * scale}`;
    })
    .join(" ");
}

export function EnglishSkills({
  skills,
  unavailable = false,
  timezone = "Asia/Ho_Chi_Minh",
}: {
  skills: EnglishSkill[];
  unavailable?: boolean;
  timezone?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const radarSkills = normalizeEnglishSkillsForRadar(skills, unavailable);
  const assessedSkills = radarSkills.filter(
    (datum) => datum.status === "ASSESSED" && datum.skill.status === "ASSESSED",
  );

  return (
    <section
      className="english-skills-section"
      aria-labelledby="english-skills-heading"
    >
      <div className="section-heading-row english-skills-heading">
        <div>
          <p className="eyebrow">{t("Trình độ hiện tại")}</p>
          <h2 id="english-skills-heading">{t("Kỹ năng tiếng Anh")}</h2>
        </div>
        <p>{t("Chỉ hiển thị kết quả từ những bài đánh giá bạn đã hoàn thành.")}</p>
      </div>

      <div className="english-skills-radar-card">
        <figure
          className="english-skills-radar-figure"
          aria-label={t("Biểu đồ radar trình độ bốn kỹ năng tiếng Anh")}
        >
          <div className="english-skills-radar-stage">
            <svg
              className="english-skills-radar"
              viewBox="0 0 400 400"
              aria-hidden="true"
            >
              {[1, 0.75, 0.5, 0.25].map((scale) => (
                <polygon
                  className="english-skills-radar-ring"
                  key={scale}
                  points={polygonPoints(scale)}
                />
              ))}
              {axisVectors.map(({ x, y }, index) => (
                <line
                  className="english-skills-radar-axis"
                  key={radarSkills[index].key}
                  x1={center}
                  y1={center}
                  x2={center + x * radius}
                  y2={center + y * radius}
                />
              ))}
              <polygon
                className="english-skills-radar-value"
                points={dataPoints(radarSkills)}
              />
              {radarSkills.map((skill, index) => {
                if (skill.status !== "ASSESSED") return null;
                const vector = axisVectors[index];
                const scale = skill.plotValue / 100;
                return (
                  <circle
                    className="english-skills-radar-point"
                    key={skill.key}
                    cx={center + vector.x * radius * scale}
                    cy={center + vector.y * radius * scale}
                    r="5"
                  />
                );
              })}
            </svg>

            {radarSkills.map((skill) => (
              <div
                className={`english-skills-axis-label is-${skill.key}`}
                data-skill-status={skill.status}
                key={skill.key}
                aria-label={
                  skill.status === "ASSESSED" && skill.skill.status === "ASSESSED"
                    ? `${skill.label}: ${skill.skill.value}, ${skill.skill.scale}`
                    : undefined
                }
              >
                <strong>{skill.label}</strong>
                <span>{skill.displayValue}</span>
              </div>
            ))}
          </div>
          <figcaption>
            {unavailable
              ? t("Không thể tải dữ liệu đánh giá lúc này.")
              : t("Not assessed nghĩa là kỹ năng chưa có bài đánh giá; vị trí ở tâm chỉ dùng để vẽ biểu đồ, không phải điểm 0.")}
          </figcaption>
        </figure>

        <div className="english-skills-evidence">
          <p className="eyebrow">{t("Căn cứ đánh giá")}</p>
          {unavailable ? (
            <p className="english-skills-unavailable" role="status">
              {t("Dữ liệu đánh giá tạm thời không khả dụng. Vui lòng thử lại sau.")}
            </p>
          ) : assessedSkills.length ? (
            assessedSkills.map((datum) => {
              if (datum.skill.status !== "ASSESSED") return null;
              return (
                <article className="english-skills-evidence-item" key={datum.key}>
                  <div>
                    <span>{datum.label}</span>
                    <p>
                      <strong>{datum.skill.value}</strong>
                      <small>{datum.skill.scale}</small>
                    </p>
                  </div>
                  <p>
                    {datum.skill.source} ·{" "}
                    {new Date(datum.skill.assessedAt).toLocaleDateString(intlLocale(locale), {
                      timeZone: timezone,
                    })}
                  </p>
                  <Link href={`/history/${datum.skill.sessionId}`}>
                    {t("Xem kết quả")}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </article>
              );
            })
          ) : (
            <p className="english-skills-unavailable">
              {t("Chưa có bài đánh giá kỹ năng nào được hoàn thành.")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
