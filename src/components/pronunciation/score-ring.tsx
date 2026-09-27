import React, { type CSSProperties } from "react";
import { classifyPronunciationScore } from "../../modules/pronunciation-practice/scoring";
import { bandLabels } from "./session-model";

export function ScoreRing({ score }: { score: number }) {
  const band = classifyPronunciationScore(score);
  return <div className="pron-score">
    <div aria-label={`Điểm phát âm: ${score} trên 100`} className={`pron-score-ring band-${band.toLowerCase()}`} role="img"
      style={{ "--score-angle": `${Math.max(0, Math.min(100, score)) * 3.6}deg` } as CSSProperties}>
      <span aria-hidden="true"><strong>{Math.round(score)}</strong><small>/100</small></span>
    </div>
    <strong>{bandLabels[band]}</strong>
  </div>;
}
