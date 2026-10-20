import type { GeneralCandidate } from "../questions/general-selection";

// Original ACTIVE bank rows in raw_data/General English Topics.csv.
// The last slot asks for an explanation/opinion, beyond the easy personal warmup.
const opinionSlots: Readonly<Record<string, string>> = {
  DAILY_ROUTINE: "005", FAMILY_FRIENDS: "003", FOOD_COOKING: "005",
  SHOPPING: "003", TRAVEL: "005", TRANSPORTATION: "003", WORK: "005",
  STUDY: "005", HOBBIES: "005", MOVIES_MUSIC: "003", HEALTH_FITNESS: "003",
  TECHNOLOGY: "005", HOME_NEIGHBORHOOD: "005", SOCIAL_SITUATIONS: "005", FUTURE_PLANS: "005",
};

export function selectQuickCheckQuestions(candidates: readonly GeneralCandidate[]): GeneralCandidate[] {
  const prefix = candidates[0]?.code.match(/^GENERAL_(.+)_[BIA]_\d{3}$/)?.[1];
  const opinion = prefix ? opinionSlots[prefix] : undefined;
  if (!prefix || !opinion || new Set(candidates.map((question) => question.topicId)).size !== 1) {
    throw new Error("Quick check questions are unavailable for this topic.");
  }
  const slots = [
    { code: `GENERAL_${prefix}_B_001`, difficulty: "BEGINNER" },
    { code: `GENERAL_${prefix}_I_001`, difficulty: "INTERMEDIATE" },
    { code: `GENERAL_${prefix}_I_${opinion}`, difficulty: "INTERMEDIATE" },
  ];
  const selected = slots.map((slot) => candidates.find((question) => question.code === slot.code && question.difficulty === slot.difficulty));
  if (selected.some((question) => !question) || new Set(selected.map((question) => question?.id)).size !== 3) {
    throw new Error("Quick check requires three available warmup, topic, and opinion questions.");
  }
  return selected as GeneralCandidate[];
}
