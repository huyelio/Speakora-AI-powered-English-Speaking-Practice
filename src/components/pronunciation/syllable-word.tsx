"use client";

import React, { useId, useState } from "react";
import type { PronunciationSyllableAnalysis } from "../../modules/pronunciation-analysis/types";
import { classifyPronunciationScore } from "../../modules/pronunciation-practice/scoring";
import { bandLabels, composeSyllables } from "./session-model";

export function SyllableWord({ word, syllables }: { word: string; syllables: PronunciationSyllableAnalysis[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const detailId = useId();
  const composed = composeSyllables(word, syllables);
  const detail = selected === null ? null : syllables[selected];
  const segments = syllables.map((part, index) => {
    const band = classifyPronunciationScore(part.accuracy);
    const status = `${bandLabels[band]}${part.isMissing ? ", thiếu âm tiết" : ""}${part.isExtra ? ", thừa âm tiết" : ""}`;
    return <button aria-controls={detailId} aria-pressed={selected === index}
      aria-label={`Âm tiết ${part.text}: ${part.accuracy}/100, ${status}`}
      className={`pron-syllable band-${band.toLowerCase()}${part.isMissing || part.isExtra ? " has-gap" : ""}`}
      key={index} onClick={() => setSelected(index)} onFocus={() => setSelected(index)} type="button">
      {composed?.[index] ?? (part.text || "∅")}
    </button>;
  });
  return <div className="pron-word-feedback">
    {composed ? <h1 aria-label={word} className="pron-word" tabIndex={-1} lang="en">{segments}</h1>
      : <><h1 className="pron-word" tabIndex={-1} lang="en">{word}</h1>{syllables.length > 0 && <div className="pron-segment-fallback"><p>Các âm tiết được nhận diện</p><div lang="en">{segments}</div></div>}</>}
    {syllables.length > 0 && <>
      <p className="pron-hint">Chọn một âm tiết để xem chi tiết.</p>
      <div className="pron-syllable-detail" id={detailId} aria-live="polite">
        {detail ? <>
          <strong>Âm tiết <span lang="en">{detail.text || "không xác định"}</span> · {detail.accuracy}/100</strong>
          <dl><div><dt>IPA chuẩn</dt><dd lang="en">{detail.expectedIpa ?? "Chưa có"}</dd></div><div><dt>IPA nghe được</dt><dd lang="en">{detail.detectedIpa ?? "Chưa nhận diện"}</dd></div></dl>
          <p>{detail.isMissing ? "Thiếu âm tiết. " : ""}{detail.isExtra ? "Thừa âm tiết. " : ""}{!detail.isMissing && !detail.isExtra ? "Không phát hiện âm tiết thiếu hoặc thừa." : "Hãy nghe mẫu và ghi âm lại."}</p>
        </> : <p>Điểm và IPA của âm tiết sẽ xuất hiện tại đây.</p>}
      </div>
    </>}
  </div>;
}
