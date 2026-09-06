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
        <strong>{current} days</strong>
        <small>Current streak · Best {longest}</small>
      </div>
      <div>
        <span aria-hidden="true" className="stat-icon">✦</span>
        <strong>{totalXp} XP</strong>
        <small>Level {level}</small>
      </div>
    </article>
  );
}
