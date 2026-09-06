import React from "react";

export function StreakCard({
  current,
  longest,
  totalXp,
  level,
}: {
  current: number;
  longest: number;
  totalXp: number;
  level: number;
}) {
  return (
    <article className="dashboard-card streak-card">
      <div>
        <span aria-hidden="true" className="stat-icon">🔥</span>
        <strong>{current} ngày</strong>
        <small>Chuỗi hiện tại · Kỷ lục {longest} ngày</small>
      </div>
      <div>
        <span aria-hidden="true" className="stat-icon">✦</span>
        <strong>{totalXp} XP</strong>
        <small>Cấp {level}</small>
      </div>
    </article>
  );
}
