import type { SpeakingPronunciationFeedback, SpeakingPronunciationWord } from "./types";

// Older metadata may omit display fields. Validate the fields used for ranking.
type StoredSyllable = {
  accuracy: number; isMissing: boolean; isExtra: boolean;
  text?: unknown; expectedIpa?: unknown; detectedIpa?: unknown;
};
type StoredWord = { text: string; accuracy: number; syllables: StoredSyllable[] };
type StoredMetrics = {
  durationMs: number | null; wordCount: number; wpm: number | null;
  longPauseCount: number; fillerCount: number; repetitionCount: number; examples: string[];
};
type StoredResult = {
  schemaVersion: 1 | 2;
  overall: { accuracy: number; fluency?: number | null; prosody?: number | null };
  words: StoredWord[];
  metrics?: StoredMetrics;
};

export function mapSpeakingPronunciationFeedback(
  providerMetadata: readonly unknown[],
  totalAnswerCount = providerMetadata.length,
): SpeakingPronunciationFeedback {
  const results = providerMetadata.flatMap((metadata) => {
    const pronunciation = record(metadata)?.pronunciation;
    const envelope = record(pronunciation);
    return (envelope?.provider === "lingolix" || envelope?.provider === "azure")
      && isPronunciationResult(envelope.result)
      ? [envelope.result]
      : [];
  });
  if (!results.length) return {
    available: false, status: "UNAVAILABLE",
    summary: "Chưa thể phân tích phát âm cho phiên này",
    practiceWords: [], wordDetails: [], analyzedAnswerCount: 0, totalAnswerCount,
    prosody: "UNAVAILABLE", wpm: null, longPauseCount: 0, fillerCount: 0,
    repetitionCount: 0, examples: [],
  };

  const candidates = results.flatMap((result) => result.words.flatMap((word) => {
    const attentionCount = word.syllables.filter(needsPractice).length;
    if (!word.text.trim() || (word.accuracy >= 70 && !attentionCount)) return [];
    return [{
      word,
      hasGap: word.syllables.some((part) => part.isMissing || part.isExtra),
      lowestAccuracy: word.syllables.reduce((lowest, part) => Math.min(lowest, part.accuracy), word.accuracy),
      attentionCount,
    }];
  }));
  const clarityAttention = results.some((result) => result.overall.accuracy < 80
    || result.words.some((word) => word.accuracy < 70 || word.syllables.some(needsPractice)));
  const fluencyAttention = results.some((result) => score(result.overall.fluency) && result.overall.fluency! < 70);
  const prosodyScores = results.flatMap((result) => score(result.overall.prosody) ? [result.overall.prosody!] : []);
  const prosody = !prosodyScores.length ? "UNAVAILABLE"
    : prosodyScores.some((value) => value < 70) ? "ATTENTION" : "CLEAR";
  const needsAttention = clarityAttention || fluencyAttention || prosody === "ATTENTION";
  // Stable sorting preserves question/word order for equal priorities.
  candidates.sort((a, b) => Number(b.hasGap) - Number(a.hasGap)
    || a.lowestAccuracy - b.lowestAccuracy || b.attentionCount - a.attentionCount);
  const seen = new Set<string>();
  const wordDetails: SpeakingPronunciationWord[] = [];
  for (const { word } of candidates) {
    const text = word.text.trim();
    const key = text.toLocaleLowerCase("en");
    if (seen.has(key)) continue;
    seen.add(key);
    wordDetails.push({
      word: text,
      practiceReason: word.syllables.some((part) => part.isMissing) ? "MISSING_SOUND"
        : word.syllables.some((part) => part.isExtra) ? "EXTRA_SOUND"
        : word.syllables.some((part) => part.accuracy < 70) ? "SYLLABLE_ATTENTION"
        : "WORD_ATTENTION",
      syllables: word.syllables.map((part) => ({
        text: displayText(part.text), expectedIpa: displayText(part.expectedIpa),
        detectedIpa: displayText(part.detectedIpa),
        status: needsPractice(part) ? "ATTENTION" : "CLEAR",
        isMissing: part.isMissing, isExtra: part.isExtra,
      })),
    });
    if (wordDetails.length === 3) break;
  }

  const metrics = results.flatMap((result) => isStoredMetrics(result.metrics) ? [result.metrics] : []);
  const totalDurationMs = metrics.reduce((sum, item) => sum + (item.durationMs ?? 0), 0);
  const totalWords = metrics.reduce((sum, item) => sum + item.wordCount, 0);
  return {
    available: true,
    status: needsAttention ? "ATTENTION" : "CLEAR",
    summary: needsAttention ? "Một số từ cần chú ý" : "Các bản ghi đã phân tích nhìn chung rõ ràng",
    practiceWords: wordDetails.map((word) => word.word), wordDetails,
    analyzedAnswerCount: results.length, totalAnswerCount,
    clarity: clarityAttention ? "ATTENTION" : "CLEAR",
    fluency: fluencyAttention ? "ATTENTION" : "CLEAR",
    prosody,
    wpm: totalDurationMs > 0 ? Math.round(totalWords * 60_000 / totalDurationMs * 10) / 10 : null,
    longPauseCount: metrics.reduce((sum, item) => sum + item.longPauseCount, 0),
    fillerCount: metrics.reduce((sum, item) => sum + item.fillerCount, 0),
    repetitionCount: metrics.reduce((sum, item) => sum + item.repetitionCount, 0),
    examples: [...new Set(metrics.flatMap((item) => item.examples))].slice(0, 3),
  };
}

function needsPractice(part: StoredSyllable): boolean {
  return part.accuracy < 70 || part.isMissing || part.isExtra;
}

function displayText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function score(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function isPronunciationResult(value: unknown): value is StoredResult {
  const result = record(value);
  const overall = record(result?.overall);
  if ((result?.schemaVersion !== 1 && result?.schemaVersion !== 2) || result.languageCode !== "en"
    || !score(overall?.accuracy)
    || !Array.isArray(result.words)) return false;

  return result.words.every((candidate) => {
    const word = record(candidate);
    return typeof word?.text === "string"
      && score(word.accuracy)
      && Array.isArray(word.syllables)
      && word.syllables.every((part) => {
        const syllable = record(part);
        return score(syllable?.accuracy)
          && typeof syllable?.isMissing === "boolean"
          && typeof syllable.isExtra === "boolean";
      });
  });
}

function isStoredMetrics(value: unknown): value is StoredMetrics {
  const metrics = record(value);
  return Boolean(metrics
    && (metrics.durationMs === null || (typeof metrics.durationMs === "number" && metrics.durationMs >= 0))
    && typeof metrics.wordCount === "number" && metrics.wordCount >= 0
    && (metrics.wpm === null || (typeof metrics.wpm === "number" && metrics.wpm >= 0))
    && typeof metrics.longPauseCount === "number" && metrics.longPauseCount >= 0
    && typeof metrics.fillerCount === "number" && metrics.fillerCount >= 0
    && typeof metrics.repetitionCount === "number" && metrics.repetitionCount >= 0
    && Array.isArray(metrics.examples)
    && metrics.examples.every((item) => typeof item === "string"));
}
