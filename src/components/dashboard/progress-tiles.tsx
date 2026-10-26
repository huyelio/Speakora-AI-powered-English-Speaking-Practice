import React from "react";
import { Flame } from "lucide-react";

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
  const bounded = Math.min(completed, target);
  const percentage = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  const toNextLevel = Math.max(0, level * XP_PER_LEVEL - totalXp);
  return (
    <section className="a5-tiles" aria-label="Tiến độ học tập">
      <article className="a5-tile a5-tile-goal">
        <div
          aria-label="Tiến độ trả lời hôm nay"
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
          <h3>Mục tiêu hôm nay</h3>
          <p>{completed >= target ? "Bạn đã hoàn thành mục tiêu hôm nay." : `Còn ${target - completed} câu trả lời nữa là đạt.`}</p>
        </div>
      </article>
      <article className="a5-tile a5-tile-streak">
        <div className="a5-medal" aria-hidden="true">{streakCurrent}<small>ngày</small></div>
        <div>
          <h3><Flame aria-hidden="true" size={18} /> Chuỗi ngày học</h3>
          <p>{streakCurrent} ngày liên tiếp · dài nhất {streakLongest} ngày.</p>
        </div>
      </article>
      <article className="a5-tile a5-tile-xp">
        <div className="a5-medal" aria-hidden="true">{totalXp}<small>XP</small></div>
        <div>
          <h3>Cấp {level}</h3>
          <p>{totalXp} XP · còn {toNextLevel} XP nữa để lên cấp {level + 1}.</p>
        </div>
      </article>
    </section>
  );
}
