export type StreakState = {
  current: number;
  longest: number;
  lastAchievedDate: string | null;
};

export function learnerLocalDate(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    throw new Error("Invalid timezone.");
  }
}

const dayNumber = (date: string) => Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

export function nextStreak(state: StreakState, achievedDate: string): StreakState {
  if (state.lastAchievedDate === achievedDate) return state;

  const adjacent = state.lastAchievedDate !== null
    && dayNumber(achievedDate) - dayNumber(state.lastAchievedDate) === 1;
  const current = adjacent ? state.current + 1 : 1;

  return {
    current,
    longest: Math.max(state.longest, current),
    lastAchievedDate: achievedDate,
  };
}

export function effectiveCurrentStreak(state: StreakState, localDate: string): number {
  if (state.lastAchievedDate === null) return 0;
  const daysSinceAchievement = dayNumber(localDate) - dayNumber(state.lastAchievedDate);
  return daysSinceAchievement === 0 || daysSinceAchievement === 1
    ? state.current
    : 0;
}

export const levelFromXp = (totalXp: number): number => Math.floor(Math.max(0, totalXp) / 250) + 1;
