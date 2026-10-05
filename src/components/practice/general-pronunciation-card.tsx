"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { AudioLines } from "lucide-react";
import type { SpeakingPronunciationFeedback, SpeakingPronunciationWord } from "../../modules/practice/types";

const reasonLabels: Record<NonNullable<SpeakingPronunciationWord["practiceReason"]>, string> = {
  MISSING_SOUND: "Chú ý âm còn thiếu",
  EXTRA_SOUND: "Chú ý âm đọc thừa",
  SYLLABLE_ATTENTION: "Có âm tiết cần luyện",
  WORD_ATTENTION: "Cần luyện cách đọc cả từ",
};

/** Reuse the same stored syllable evidence in the list and self-practice. */
function WordDetails({ word }: { word: SpeakingPronunciationWord }) {
  return <>
    <div className="general-word-heading">
      <h3 lang="en">{word.word}</h3>
      {word.practiceReason && <p className="general-word-reason">{reasonLabels[word.practiceReason]}</p>}
    </div>
    {word.syllables.length === 0 ? <p className="hint">Chưa có chi tiết âm tiết.</p> : <div className="general-syllables">
      {word.syllables.map((syllable, index) => syllable.status === "ATTENTION" ?
        <details className="general-syllable is-attention" key={index}>
          <summary><span lang="en">{syllable.text || "Âm tiết: Chưa có dữ liệu"}</span><small>Cần luyện</small>{syllable.expectedIpa && <span className="general-ipa" lang="en">{syllable.expectedIpa}</span>}</summary>
          <div className="general-syllable-detail">
            <p>Chuẩn: <span lang="en">{syllable.expectedIpa || "Chưa có dữ liệu"}</span></p>
            <p>Bạn đọc: <span lang="en">{syllable.detectedIpa || "Chưa có dữ liệu"}</span></p>
            {syllable.isMissing && <p>Thiếu âm</p>}
            {syllable.isExtra && <p>Thừa âm</p>}
          </div>
        </details> : <div className="general-syllable is-clear" key={index}>
          <span lang="en">{syllable.text || "Âm tiết: Chưa có dữ liệu"}</span><small>Rõ ràng</small>
          {syllable.expectedIpa && <span className="general-ipa" lang="en">{syllable.expectedIpa}</span>}
        </div>)}
    </div>}
  </>;
}

export function GeneralPronunciationCard({ value }: { value: SpeakingPronunciationFeedback }) {
  const [practicing, setPracticing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const practiceId = useId();
  const practiceHeading = useRef<HTMLHeadingElement>(null);
  const practiceButton = useRef<HTMLButtonElement>(null);
  const words = value.wordDetails;
  const index = Math.min(selectedIndex, Math.max(0, words.length - 1));
  const selectedWord = words[index];
  useEffect(() => { if (practicing) practiceHeading.current?.focus(); }, [practicing, index]);

  function togglePractice() {
    if (practicing) {
      setPracticing(false);
      practiceButton.current?.focus();
    } else {
      setSelectedIndex(0);
      setPracticing(true);
    }
  }

  return <article className={`result-pronunciation-card is-${value.status.toLowerCase()}`} aria-labelledby={`${practiceId}-title`}>
    <span className="result-pronunciation-icon" aria-hidden="true"><AudioLines size={24} /></span>
    <div className="result-pronunciation-content">
      <p className="eyebrow">PHẢN HỒI TỪ AUDIO</p>
      <h2 id={`${practiceId}-title`}>Phát âm</h2>
      <p className="result-pronunciation-summary">{value.summary}</p>
      {value.totalAnswerCount > 0 && <p className="general-pronunciation-coverage">Có phản hồi audio cho {value.analyzedAnswerCount}/{value.totalAnswerCount} câu</p>}
      {!value.available && <p className="result-pronunciation-note">Phiên này chưa có dữ liệu phân tích audio. Hãy hoàn thành một phiên mới hoặc luyện từng từ ở mục Phát âm.</p>}
      {value.available && value.status === "ATTENTION" && words.length === 0 && <p className="result-pronunciation-note">Chưa xác định được từ cụ thể cần luyện từ các bản ghi đã phân tích.</p>}
      {value.available && words.length > 0 && <>
        <p className="general-word-hint">Từ nên luyện · Chọn âm tiết cần luyện để xem cách đọc.</p>
        <ul className="general-word-details" aria-label="Từ cần luyện">
          {words.map((word) => <li key={word.word}><WordDetails word={word} /></li>)}
        </ul>
        <button ref={practiceButton} type="button" className="primary" aria-expanded={practicing} aria-controls={practiceId} onClick={togglePractice}>{practicing ? "Đóng phần tự ôn" : "Luyện các từ này"}</button>
        <section id={practiceId} className="general-self-practice" hidden={!practicing} aria-labelledby={`${practiceId}-practice`}>
          <h3 ref={practiceHeading} tabIndex={-1} id={`${practiceId}-practice`}>Tự ôn từng từ</h3>
          <p className="general-practice-counter" aria-live="polite" aria-atomic="true">Từ {index + 1}/{words.length}</p>
          <p>Đọc lại từ này, chú ý các âm tiết được đánh dấu.</p>
          {selectedWord && <div className="general-practice-word" key={selectedWord.word}><WordDetails word={selectedWord} /></div>}
          <div className="general-practice-controls">
            <button type="button" className="secondary" disabled={index === 0} onClick={() => setSelectedIndex(index - 1)}>Trước</button>
            <button type="button" className="secondary" disabled={index === words.length - 1} onClick={() => setSelectedIndex(index + 1)}>Tiếp</button>
          </div>
          <p className="hint">Tự luyện, không ghi âm hoặc chấm lại.</p>
        </section>
      </>}
      {value.available && <p className="general-pronunciation-disclosure">Phản hồi tham khảo từ audio; kết quả có thể bị ảnh hưởng nếu nhận diện lời nói chưa chính xác.</p>}
    </div>
  </article>;
}
