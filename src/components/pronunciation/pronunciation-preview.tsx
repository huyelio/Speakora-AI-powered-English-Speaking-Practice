"use client";

import React, { useEffect, useRef, useState } from "react";
import { AudioLines, Headphones, Mic, Square, Volume2 } from "lucide-react";

export function PronunciationPreview() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => () => {
    if (utteranceRef.current) {
      utteranceRef.current = null;
      window.speechSynthesis?.cancel();
    }
  }, []);

  function listen() {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setError("Trình duyệt này chưa hỗ trợ nghe mẫu. Bạn vẫn có thể bắt đầu phiên luyện.");
      return;
    }
    if (utteranceRef.current) {
      utteranceRef.current = null;
      window.speechSynthesis.cancel();
      setListening(false);
      return;
    }
    setError("");
    const utterance = new SpeechSynthesisUtterance("banana");
    utterance.lang = "en-GB";
    utterance.rate = .85;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang === "en-GB");
    if (voice) utterance.voice = voice;
    utteranceRef.current = utterance;
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setListening(false);
    };
    utterance.onerror = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setListening(false);
      setError("Chưa thể phát mẫu trên trình duyệt này. Hãy thử lại hoặc bắt đầu phiên luyện.");
    };
    try {
      setListening(true);
      window.speechSynthesis.speak(utterance);
    } catch {
      utteranceRef.current = null;
      setListening(false);
      setError("Chưa thể phát mẫu trên trình duyệt này. Hãy thử lại hoặc bắt đầu phiên luyện.");
    }
  }

  return <aside className={`pron-preview-card${listening ? " is-listening" : ""}`} aria-labelledby="pron-preview-heading">
    <div className="pron-preview-heading"><span><Headphones size={18} aria-hidden="true" /> NGHE THỬ</span><span className="pron-preview-badge">Ví dụ</span></div>
    <div className="pron-preview-visual" aria-hidden="true">
      <div className="pron-preview-wave">{[12, 24, 38, 26, 48, 34, 20].map((height, index) => <i style={{ height }} key={index} />)}</div>
      <span className="pron-preview-mic"><Mic size={32} strokeWidth={1.6} /></span>
      <div className="pron-preview-wave">{[20, 34, 48, 26, 38, 24, 12].map((height, index) => <i style={{ height }} key={index} />)}</div>
    </div>
    <p className="pron-preview-kicker" id="pron-preview-heading">Minh họa cách luyện</p>
    <h2 className="pron-preview-word" lang="en">banana</h2>
    <p className="pron-preview-ipa" lang="en">/bəˈnɑːnə/</p>
    <div className="pron-preview-syllables" lang="en" aria-label="ba, na, na; trọng âm ở âm tiết thứ hai"><span>ba</span><span className="is-stressed">na</span><span>na</span></div>
    <p className="pron-preview-stress">Trọng âm ở âm tiết thứ hai</p>
    <button className="secondary pron-preview-listen" type="button" aria-label={listening ? "Dừng nghe mẫu từ banana" : "Nghe mẫu từ banana"} aria-pressed={listening} onClick={listen}>
      {listening ? <Square size={17} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}{listening ? "Dừng nghe" : "Nghe mẫu"}
    </button>
    {error && <p className="pron-preview-error" role="status">{error}</p>}
    <div className="pron-preview-note"><AudioLines size={19} aria-hidden="true" /><p>Nghe từng từ, nói theo và nhận phản hồi về các âm cần luyện.</p></div>
    <p className="pron-preview-disclosure">Từ minh họa · Giọng đọc của trình duyệt, không phải kết quả đánh giá.</p>
  </aside>;
}
