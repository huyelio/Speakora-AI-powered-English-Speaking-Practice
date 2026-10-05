"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import type {
  AnswerReview,
  CriterionFeedback,
  GeneralResultExperience,
  PracticeResult,
} from "../../modules/practice/types";
import { GeneralPronunciationCard } from "./general-pronunciation-card";

type ResultViewProps = {
  result: PracticeResult;
  answers: AnswerReview[];
  principalKind: "user" | "guest";
  guestToken?: string;
  experience?: GeneralResultExperience | null;
  onRestart?: () => void;
};

export function ResultView(props: ResultViewProps) {
  switch (props.result.mode) {
    case "IELTS":
      return <IeltsResult {...props} result={props.result} />;
    case "GENERAL":
      return <GeneralResult {...props} result={props.result} />;
    default:
      return assertNever(props.result);
  }
}

function IeltsResult({ result, ...props }: ResultViewProps & {
  result: Extract<PracticeResult, { mode: "IELTS" }>;
}) {
  return (
    <ResultLayout result={result} {...props}>
      <div className="band-card">
        <span>Band ước tính bởi AI</span>
        <strong>{result.estimatedBand.toFixed(1)}</strong>
      </div>
      <Criteria result={result} includePronunciationDisclosure />
      <p className="disclosure">
        Band trên là ước tính của AI dựa trên transcript, không phải điểm IELTS chính thức.
        Phát âm chưa được chấm vì kết quả này không phân tích trực tiếp tín hiệu âm thanh.
      </p>
    </ResultLayout>
  );
}

function GeneralResult({ result, experience, answers, principalKind, guestToken, onRestart }: ResultViewProps & {
  result: Extract<PracticeResult, { mode: "GENERAL" }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const remainingStrengths = result.strengths.slice(1);
  const remainingImprovements = result.improvements.slice(1);
  return (
    <div className="stage result-stage general-result">
      <section className="general-summary" aria-labelledby="general-summary-heading">
        <p className="eyebrow"><CheckCircle2 size={18} aria-hidden="true" /> HOÀN THÀNH PHIÊN LUYỆN</p>
        <h1 id="general-summary-heading">Thêm một bước tiến trong giao tiếp</h1>
        <p id="general-overall" className={`general-overall${result.overallFeedback.length > 180 && !expanded ? " is-clamped" : ""}`}>{result.overallFeedback}</p>
        {result.overallFeedback.length > 180 && <button className="general-text-button" aria-expanded={expanded} aria-controls="general-overall" onClick={() => setExpanded(!expanded)}>{expanded ? "Thu gọn" : "Xem đầy đủ"}</button>}
        <div className="general-takeaways">
          {result.strengths[0] && <div><span>Bạn làm tốt</span><p>{result.strengths[0]}</p></div>}
          {result.improvements[0] && <div className="is-improvement"><span>Ưu tiên cải thiện</span><p>{result.improvements[0]}</p></div>}
        </div>
      </section>
      <GeneralPronunciationCard value={result.pronunciation} />
      {result.criteria ? <Criteria result={result} collapseExamples />
        : <p className="hint">Chưa có nhận xét theo tiêu chí cho phiên này.</p>}
      {(remainingStrengths.length > 0 || remainingImprovements.length > 0 || result.nextSteps.length > 0) && <section className="general-coaching" aria-labelledby="general-coaching-heading">
        <h2 id="general-coaching-heading">Định hướng luyện tập</h2>
        <div className="general-coaching-grid">
          <CoachingGroup title="Điểm mạnh" items={remainingStrengths} />
          <CoachingGroup title="Cần cải thiện" items={remainingImprovements} />
          <CoachingGroup title="Bước tiếp theo" items={result.nextSteps} />
        </div>
      </section>}
      {result.usefulPhrase && <section className="general-phrase" aria-labelledby="general-phrase-heading">
        <h2 id="general-phrase-heading">Gợi ý cho lần sau</h2>
        <p className="hint">Một cách diễn đạt bạn có thể dùng trong tình huống tương tự.</p>
        <blockquote lang="en">{result.usefulPhrase}</blockquote>
      </section>}
      {experience ? (
        <section aria-labelledby="progress-heading" className="result-progress">
          <h2 id="progress-heading">Tiến bộ sau phiên luyện</h2>
          <div className="general-progress-inline">
            <span><strong>+{experience.rewards.sessionXp} XP</strong> phiên này</span>
            <span>{experience.rewards.totalXp} XP · Cấp {experience.rewards.level}</span>
            <span>Chuỗi hiện tại: {experience.streak.current} ngày</span>
          </div>
          <p className="daily-goal" role="status">
            Mục tiêu hôm nay: {experience.dailyGoal.completed}/{experience.dailyGoal.target} câu
            {experience.dailyGoal.achieved ? " · Đã hoàn thành" : ""}
          </p>
          {experience.nextTopic && (
            <div className="next-topic-block">
              <p>{recommendationReason(experience.nextTopic.reason)}</p>
              <Link className="secondary next-topic" href={`/topics/${experience.nextTopic.slug}`}>
                Chủ đề tiếp theo: {experience.nextTopic.name}
              </Link>
            </div>
          )}
        </section>
      ) : (
        <p className="hint">Tiến độ thưởng hiện chưa tải được. Hãy tải lại trang để cập nhật.</p>
      )}
      <section className="answer-review" aria-labelledby="general-review-heading">
        <h2 id="general-review-heading">Xem lại câu trả lời</h2>
        {answers.map((answer) => <details className="general-answer" key={answer.answerId}>
          <summary><span>Câu {answer.sequenceNo}</span><strong>{answer.promptText}</strong></summary>
          <div className="general-answer-content">
            <AuthorizedAudio endpoint={answer.audioUrl} guestToken={principalKind === "guest" ? guestToken : undefined} />
            <h3>Transcript gốc</h3><p className="transcript">{answer.transcript}</p>
          </div>
        </details>)}
      </section>
      {onRestart && <button className="secondary" onClick={onRestart}>Luyện phiên mới</button>}
    </div>
  );
}

function CoachingGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <div><h3>{title}</h3><p>{items[0]}</p>{items.length > 1 && <details><summary>Xem thêm ({items.length - 1})</summary><ul>{items.slice(1).map((item, index) => <li key={index}>{item}</li>)}</ul></details>}</div>;
}

function ResultLayout({
  result,
  answers,
  principalKind,
  guestToken,
  onRestart,
  children,
}: ResultViewProps & { children: React.ReactNode }) {
  return (
    <div className="stage result-stage">
      <p className="eyebrow">HOÀN THÀNH PHIÊN LUYỆN</p>
      {children}
      <article className="feedback-card">
        <h2>Nhận xét tổng quan</h2>
        <p>{result.overallFeedback}</p>
      </article>
      <div className="feedback-grid result-lists">
        <Feedback title="Điểm mạnh" items={result.strengths} />
        <Feedback title="Cần cải thiện" items={result.improvements} />
        <Feedback title="Gợi ý luyện tập tiếp theo" items={result.nextSteps} />
      </div>
      <section className="answer-review">
        <h2>Xem lại câu trả lời</h2>
        {answers.map((answer) => (
          <article className="feedback-card" key={answer.answerId}>
            <p className="eyebrow">CÂU {answer.sequenceNo} · {answer.questionType.replaceAll("_", " ")}</p>
            <h3>{answer.promptText}</h3>
            <AuthorizedAudio
              endpoint={answer.audioUrl}
              guestToken={principalKind === "guest" ? guestToken : undefined}
            />
            <h4>Transcript gốc</h4>
            <p className="transcript">{answer.transcript}</p>
          </article>
        ))}
      </section>
      {onRestart && <button className="primary" onClick={onRestart}>Luyện phiên mới</button>}
    </div>
  );
}

function Criteria({ result, includePronunciationDisclosure = false, collapseExamples = false }: {
  result: PracticeResult;
  includePronunciationDisclosure?: boolean;
  collapseExamples?: boolean;
}) {
  return (
    <section aria-labelledby="criteria-heading" className="criteria-section">
      <h2 id="criteria-heading">Đánh giá theo tiêu chí</h2>
      <div className="feedback-grid criteria-grid">
        {result.criteria && (
          <>
            <Criterion title="Độ trôi chảy & mạch lạc" value={result.criteria.fluencyCoherence} collapseExample={collapseExamples} />
            <Criterion title="Từ vựng" value={result.criteria.lexicalResource} collapseExample={collapseExamples} />
            <Criterion title="Ngữ pháp" value={result.criteria.grammaticalRangeAccuracy} collapseExample={collapseExamples} />
          </>
        )}
        {includePronunciationDisclosure && (
          <Criterion
            title="Phát âm — Chưa đánh giá"
            value={{ summary: "Tiêu chí này cần phân tích trực tiếp âm thanh và không thể suy ra đáng tin cậy từ transcript.", example: null }}
          />
        )}
      </div>
    </section>
  );
}

function Criterion({ title, value, collapseExample = false }: { title: string; value: CriterionFeedback; collapseExample?: boolean }) {
  const example = value.example && <p className="criterion-example"><strong>Ví dụ:</strong> “{value.example.original}”{value.example.corrected && <> → “{value.example.corrected}”</>}</p>;
  return (
    <article className="feedback-card">
      <h3>{title}</h3>
      <p>{value.summary}</p>
      {example && (collapseExample ? <details><summary>Xem ví dụ</summary>{example}</details> : example)}
    </article>
  );
}

function Feedback({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="feedback-card">
      <h2>{title}</h2>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </article>
  );
}

function recommendationReason(
  reason: NonNullable<GeneralResultExperience["nextTopic"]>["reason"],
): string {
  const labels: Record<typeof reason, string> = {
    LEVEL_MATCH: "Phù hợp với trình độ hiện tại của bạn.",
    NEW_TOPIC: "Chủ đề mới để mở rộng vốn diễn đạt.",
    WEAKNESS_MATCH: "Giúp luyện thêm điểm cần cải thiện vừa được ghi nhận.",
    LEVEL_UP: "Thử thách tiếp theo khi bạn đã sẵn sàng nâng trình độ.",
  };
  return labels[reason];
}

function AuthorizedAudio({ endpoint, guestToken }: { endpoint: string; guestToken?: string }) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  async function load() {
    setState("loading");
    try {
      const response = await fetch(endpoint, {
        headers: guestToken ? { Authorization: `Bearer ${guestToken}` } : undefined,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Audio unavailable");
      setUrl(URL.createObjectURL(await response.blob()));
      setState("idle");
    } catch {
      setState("failed");
    }
  }

  if (url) return <audio controls preload="metadata" src={url} />;
  return (
    <>
      {state === "failed" && <p className="error" role="alert">Không thể tải bản ghi âm.</p>}
      <button className="secondary" disabled={state === "loading"} onClick={load}>
        {state === "loading" ? "Đang tải bản ghi…" : state === "failed" ? "Thử tải lại" : "▶ Nghe bản ghi âm"}
      </button>
    </>
  );
}

function assertNever(value: never): never {
  throw new Error(`Unsupported practice result: ${JSON.stringify(value)}`);
}
