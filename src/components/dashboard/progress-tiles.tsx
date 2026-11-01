"use client";

import React from "react";
import { Flame } from "lucide-react";
import { useT } from "../../i18n/client";

export type ProgressTilesProps = {
  completed: number;
  target: number;
  streakCurrent: number;
  streakLongest: number;
  totalXp: number;
  level: number;
};

const XP_PER_LEVEL = 250; // mirrors levelFromXp in modules/progress/rules

/** Daily goal, streak and XP as three distinct A5 tiles. */
export function ProgressTiles({ completed, target, streakCurrent, streakLongest, totalXp, level }: ProgressTilesProps) {
  const t = useT();
  const bounded = Math.min(completed, target);
  const percentage = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  const toNextLevel = Math.max(0, level * XP_PER_LEVEL - totalXp);
  return (
    <section className="a5-tiles" aria-label={t("Tiến độ học tập")}>
      <article className="a5-tile a5-tile-goal">
        <div
          aria-label={t("Tiến độ trả lời hôm nay")}
          aria-valuemax={target}
          aria-valuemin={0}
          aria-valuenow={bounded}
          className="a5-medal a5-medal-ring"
          role="progressbar"
          style={{ "--a5-progress": `${percentage}%` } as React.CSSProperties}
        >
          <span>{completed}/{target}</span>
        </div>
        <div>
          <h3>{t("Mục tiêu hôm nay")}</h3>
          <p>{completed >= target ? t("Bạn đã hoàn thành mục tiêu hôm nay.") : t("Còn {0} câu trả lời nữa là đạt.", target - completed)}</p>
        </div>
      </article>
      <article className="a5-tile a5-tile-streak">
        <div className="a5-medal" aria-hidden="true">{streakCurrent}<small>{t("ngày")}</small></div>
        <div>
          <h3><Flame aria-hidden="true" size={18} /> {t("Chuỗi ngày học")}</h3>
          <p>{streakCurrent} {t("ngày liên tiếp · dài nhất")} {streakLongest} {t("ngày.")}</p>
        </div>
      </article>
      <article className="a5-tile a5-tile-xp">
        <div className="a5-medal" aria-hidden="true">{totalXp}<small>XP</small></div>
        <div>
          <h3>{t("Cấp")} {level}</h3>
          <p>{totalXp} {t("XP · còn")} {toNextLevel} {t("XP nữa để lên cấp")} {level + 1}.</p>
        </div>
      </article>
    </section>
  );
}
