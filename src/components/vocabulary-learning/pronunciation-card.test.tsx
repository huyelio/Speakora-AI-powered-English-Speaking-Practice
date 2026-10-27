import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PronunciationCard } from "../pronunciation/pronunciation-card";
import type { PronunciationSessionItem } from "../../modules/pronunciation-practice/types";

vi.mock("../audio/use-audio-recorder", () => ({ useAudioRecorder: () => ({ state: "idle", error: "MIC_DENIED", elapsedMs: 0, recording: null, start: vi.fn(), stop: vi.fn() }) }));
vi.mock("../practice/reauthenticate-dialog", () => ({ ReauthenticateDialog: () => null }));
const item: PronunciationSessionItem = { sessionItemId: "item", vocabularyItemId: "word", sequenceNo: 1, snapshot: { word: "test", pronunciationIpa: "/test/", meaningVi: "kiểm tra", level: "BEGINNER" }, latestSuccessfulAttempt: { attemptId: "attempt", completedAt: "2026-10-25", provider: "test", score: 79, scoreBand: "PRACTICE", result: { schemaVersion: 1, referenceText: "test", scoredText: "test", languageCode: "en", overall: { accuracy: 79, completeness: 100, speakingRate: null }, words: [{ text: "test", charStart: 0, charEnd: 4, accuracy: 79, completeness: 100, startMs: null, endMs: null, syllables: [{ text: "test", accuracy: 90, completeness: 100, expectedIpa: "/test/", detectedIpa: null, pitch: "UNKNOWN", durationMs: null, startMs: null, endMs: null, isMissing: false, isExtra: false }] }] } } };

describe("opt-in V2 pronunciation card", () => {
  it("keeps legacy syllable success and final label unchanged", () => {
    const html = renderToStaticMarkup(<PronunciationCard sessionId="session" item={item} isLast onSuccess={() => {}} onNext={() => {}} />);
    expect(html).toContain("Phát âm tốt!"); expect(html).toContain("Xem tổng kết"); expect(html).not.toContain("Chưa có quyền dùng micro");
  });
  it("shows microphone recovery, backend-consistent feedback, and the V2 final action", () => {
    const html = renderToStaticMarkup(<PronunciationCard sessionId="session" item={item} isLast feedbackMode="learning-v2" nextLabel="Tiếp tục nhớ từ" onSuccess={() => {}} onNext={() => {}} />);
    expect(html).not.toContain("Phát âm tốt!"); expect(html).toContain("Cần luyện thêm phát âm"); expect(html).toContain("Chưa có quyền dùng micro"); expect(html).toContain("Tiếp tục nhớ từ"); expect(html).not.toContain("Xem tổng kết");
  });
  it("locks the microphone once the session is finished but still offers the next step", () => {
    const html = renderToStaticMarkup(<PronunciationCard sessionId="session" item={item} isLast feedbackMode="learning-v2" nextLabel="Tiếp tục nhớ từ" canRecord={false} onSuccess={() => {}} onNext={() => {}} />);
    expect(html).toMatch(/class="pron-mic"[^>]*disabled/); expect(html).toContain("không ghi âm thêm được"); expect(html).toContain("Tiếp tục nhớ từ");
  });
});
