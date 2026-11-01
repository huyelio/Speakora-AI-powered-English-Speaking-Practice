import type { PronunciationAnalysisResult } from "../../modules/pronunciation-analysis/types";
import { isWeakPronunciationResult } from "../../modules/pronunciation-practice/scoring";
import type { PronunciationSessionStatus, SuccessfulPronunciationAttempt } from "../../modules/pronunciation-practice/types";
import type { LearningSession } from "../../modules/vocabulary-learning/types";

/** Adds a scored attempt to one pronunciation item. */
export function withPronunciationAttempt(session: LearningSession, sessionItemId: string, attempt: SuccessfulPronunciationAttempt, status: PronunciationSessionStatus | null): LearningSession {
  const items = session.pronunciation.items.map(item => item.sessionItemId === sessionItemId ? { ...item, latestSuccessfulAttempt: attempt } : item);
  return { ...session, pronunciation: { ...session.pronunciation, items, status: status ?? session.pronunciation.status } };
}

/** Position after a Learn or Pronounce advance, matching mutate_vocabulary_learning_session. */
export function advanceLocally(session: LearningSession): LearningSession {
  if (session.stage !== "LEARN" && session.stage !== "PRONOUNCE") return session;
  if (session.cursor + 1 < session.items.length) return { ...session, cursor: session.cursor + 1 };
  return { ...session, cursor: 0, stage: session.stage === "LEARN" ? "PRONOUNCE" : "RECALL" };
}

/** Result and position after an answer that stays in the stage. The last answer reloads from the server. */
export function answerLocally(session: LearningSession, sessionItemId: string, correct: boolean): LearningSession {
  const result = correct ? "REMEMBERED" : "NOT_REMEMBERED";
  const field = session.stage === "RECALL" ? "review" : "contextResult";
  return { ...session, cursor: session.cursor + 1, items: session.items.map(item => item.sessionItemId === sessionItemId ? { ...item, [field]: result } : item) };
}

export function pronunciationFeedback(result: PronunciationAnalysisResult | null): "GOOD" | "WEAK" | "UNKNOWN" {
  if (!result || !Number.isFinite(result.overall?.accuracy) || result.overall.accuracy < 0 || result.overall.accuracy > 100) return "UNKNOWN";
  if (!Array.isArray(result.words) || !result.words.length || result.words.some(word => !word || !Array.isArray(word.syllables) || !word.syllables.length)) return "UNKNOWN";
  const syllables = result.words.flatMap(word => word.syllables);
  if (syllables.some(part => !part || !Number.isFinite(part.accuracy) || part.accuracy < 0 || part.accuracy > 100 || typeof part.isMissing !== "boolean" || typeof part.isExtra !== "boolean")) return "UNKNOWN";
  return isWeakPronunciationResult(result) ? "WEAK" : "GOOD";
}
