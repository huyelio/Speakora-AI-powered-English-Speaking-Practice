"use client";

import React, { useId, useState } from "react";
import type { PronunciationSyllableAnalysis } from "../../modules/pronunciation-analysis/types";
import { composeSyllables, isSyllableSuccessful } from "./session-model";

export function SyllableWord({ word, syllables }: { word: string; syllables: PronunciationSyllableAnalysis[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const detailId = useId();
  const composed = composeSyllables(word, syllables);
  const detail = selected === null ? null : syllables[selected];
  const segments = syllables.map((part, index) => {
    const successful = isSyllableSuccessful(part);
    const text = composed?.[index] ?? (part.text || "∅");
    const className = `pron-syllable ${successful ? "band-good" : "band-improve"}${part.isMissing || part.isExtra ? " has-gap" : ""}`;
    if (successful) return <span aria-label={`${part.text}, đọc tốt`} className={className} key={index}>{text}</span>;
    return <button aria-controls={detailId} aria-expanded={selected === index}
      aria-label={`${part.text}, cần cải thiện`} className={`${className} pron-syllable-button`}
      key={index} onClick={() => setSelected(selected === index ? null : index)} type="button">{text}</button>;
  });
  return <div className="pron-word-feedback">
    {composed ? <h1 aria-label={word} className="pron-word" tabIndex={-1} lang="en">{segments}</h1>
      : <><h1 className="pron-word" tabIndex={-1} lang="en">{word}</h1>{syllables.length > 0 && <div className="pron-segment-fallback"><div lang="en">{segments}</div></div>}</>}
    {detail && !isSyllableSuccessful(detail) && <div className="pron-syllable-detail" id={detailId} aria-live="polite">
      <p><strong>Chuẩn:</strong> <span lang="en">{detail.expectedIpa ?? "—"}</span></p>
      <p><strong>Bạn đọc:</strong> <span lang="en">{detail.detectedIpa ?? "—"}</span></p>
    </div>}
  </div>;
}
