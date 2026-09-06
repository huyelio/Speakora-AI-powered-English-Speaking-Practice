import React from "react";

export function DailyGoalCard({ completed, target }: { completed: number; target: number }) {
  const bounded = Math.min(completed, target);
  const percentage = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  return (
    <article className="dashboard-card daily-goal-card">
      <div className="card-heading-row">
        <div>
          <p className="eyebrow">TODAY&apos;S GOAL</p>
          <h2>{completed}/{target} answers</h2>
        </div>
        <strong>{percentage}%</strong>
      </div>
      <div
        aria-label="Daily answer progress"
        aria-valuemax={target}
        aria-valuemin={0}
        aria-valuenow={bounded}
        className="goal-progress"
        role="progressbar"
      >
        <i style={{ width: `${percentage}%` }} />
      </div>
      <p>{completed >= target ? "Goal complete — excellent work." : `${target - completed} answers left to reach your goal.`}</p>
    </article>
  );
}
