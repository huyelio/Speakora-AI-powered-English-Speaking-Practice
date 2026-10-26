"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Gauge, Sparkles, Target } from "lucide-react";
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
  onContinue?: () => void;
  isContinuing?: boolean;
};

export function ResultView(props: ResultViewProps) {
  if (props.result.mode === "GENERAL" && props.result.quickCheck) {
    const check = props.result.quickCheck;
    return <section className="quick-check-result" aria-labelledby="quick-check-result-title">
      <span className="quick-result-icon"><CheckCircle2 size={32} aria-hidden="true" /></span>
      <p className="eyebrow">SPEAKORA HIỂU BẠN HƠN RỒI</p>
      <h1 id="quick-check-result-title">Điểm bắt đầu của bạn</h1>
      <div className="quick-cefr-result"><span>CEFR ước tính</span><strong>{check.estimatedCefr}</strong></div>
      <p className="quick-result-feedback">{check.feedback}</p>
      <div className="quick-result-recommendation"><h2>Gợi ý dành cho bạn</h2><p>{check.recommendation}</p></div>
      <p className="preference-hint">Ước tính từ 3 câu trả lời, giúp bạn chọn điểm bắt đầu phù hợp.</p>
      {props.onContinue ? <button type="button" className="primary" disabled={props.isContinuing} onClick={props.onContinue}>{props.isContinuing ? "Đang lưu…" : "Bắt đầu học"}</button> : <Link className="primary" href="/onboarding">Tiếp tục thiết lập</Link>}
    </section>;
  }
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
  const priority = generalPriority(result);
  const remainingImprovements = priority.source === "improvement"
    ? result.improvements.slice(1)
    : result.improvements;
  const remainingNextSteps = priority.source === "nextStep"
    ? result.nextSteps.slice(1)
    : result.nextSteps;
  return (
    <div className="stage result-stage general-result">
      <section className="general-result-hero" aria-labelledby="general-summary-heading">
        <p className="eyebrow"><CheckCircle2 size={18} aria-hidden="true" /> Hoàn thành phiên luyện</p>
        <h1 id="general-summary-heading">{generalHeadline(result.pronunciation)}</h1>
        <p className="general-hero-support">{generalSupport(result.pronunciation)}</p>
        <div className="general-status-list" aria-label="Tóm tắt kết quả">
          <StatusItem label="Phát âm" value={pronunciationStatus(result.pronunciation)} state={result.pronunciation.status} />
          <StatusItem label="Độ trôi chảy" value={fluencyStatus(result.pronunciation)} state={result.pronunciation.fluency ?? "UNAVAILABLE"} />
          <StatusItem label="Nhịp nói" value={rhythmStatus(result.pronunciation)} state={(result.pronunciation.longPauseCount ?? 0) > 0 ? "ATTENTION" : result.pronunciation.fluency ?? "UNAVAILABLE"} />
        </div>
        <details className="general-overall-detail"><summary>Xem nhận xét tổng quan</summary><p>{result.overallFeedback}</p></details>
      </section>
      <section className="general-priority" aria-labelledby="general-priority-heading">
        <span className="general-priority-icon" aria-hidden="true"><Target size={22} /></span>
        <div><p>Ưu tiên lần tới</p><h2 id="general-priority-heading">{priority.text}</h2></div>
      </section>
      <GeneralPronunciationCard value={result.pronunciation} />
      <DeliveryFeedback value={result.pronunciation} />
      {result.criteria ? <GeneralCriteria criteria={result.criteria} />
        : <p className="hint">Chưa có nhận xét theo tiêu chí cho phiên này.</p>}
      {(result.strengths.length > 0 || remainingImprovements.length > 0 || remainingNextSteps.length > 0) && <section className="general-coaching" aria-labelledby="general-coaching-heading">
        <h2 id="general-coaching-heading">Mang theo cho lần luyện sau</h2>
        <div className="general-coaching-grid">
          <CoachingGroup title="Điểm mạnh" items={result.strengths} />
          <CoachingGroup title="Cần cải thiện" items={remainingImprovements} />
          <CoachingGroup title="Bước tiếp theo" items={remainingNextSteps} />
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
      <nav className="general-result-actions" aria-label="Hành động tiếp theo">
        {result.pronunciation.wordDetails.length > 0 && <a className="primary" href="#general-pronunciation">Luyện lại các từ <ArrowRight size={17} aria-hidden="true" /></a>}
        <Link className="secondary" href="/speaking?tab=topics">Luyện chủ đề khác</Link>
        {onRestart && <button className="secondary" onClick={onRestart}>Luyện phiên mới</button>}
      </nav>
    </div>
  );
}

function StatusItem({ label, value, state }: { label: string; value: string; state: "CLEAR" | "ATTENTION" | "UNAVAILABLE" }) {
  return <div className={`general-status is-${state.toLowerCase()}`}><span>{label}</span><strong>{value}</strong></div>;
}

function generalHeadline(value: Extract<PracticeResult, { mode: "GENERAL" }>["pronunciation"]) {
  const clear = value.clarity === "CLEAR" || (value.clarity === undefined && value.status === "CLEAR");
  if (!value.available) return "Bạn đã hoàn thành trọn vẹn phần luyện nói.";
  if (clear && value.fluency === "ATTENTION") return "Bạn nói khá rõ, nhưng còn hơi ngập ngừng.";
  if (!clear && value.fluency === "CLEAR") return "Bạn giữ nhịp khá tốt, nhưng một vài từ chưa rõ.";
  if (clear && value.fluency === "CLEAR") return "Bạn nói khá rõ và giữ nhịp tự nhiên.";
  return "Bạn đã truyền đạt được ý, giờ hãy làm lời nói rõ và liền mạch hơn.";
}

function generalSupport(value: Extract<PracticeResult, { mode: "GENERAL" }>["pronunciation"]) {
  if (!value.available) return "Xem nhận xét ngôn ngữ bên dưới để chọn một điều cần cải thiện trong lần tới.";
  if (value.status === "ATTENTION" && value.fluency === "ATTENTION") return "Tập trung vào nhịp nói và một vài từ phát âm chưa rõ trong lần luyện tiếp theo.";
  if (value.status === "ATTENTION") return "Luyện lại một vài từ chưa rõ để phần trình bày dễ nghe hơn.";
  if (value.fluency === "ATTENTION") return "Thử nối các ý thành cụm dài hơn để lời nói liền mạch hơn.";
  return "Tiếp tục giữ cách nói này và thử mở rộng câu trả lời ở chủ đề tiếp theo.";
}

function pronunciationStatus(value: Extract<PracticeResult, { mode: "GENERAL" }>["pronunciation"]) {
  if (!value.available) return "Chưa có dữ liệu";
  return value.status === "CLEAR" ? "Khá rõ" : "Cần chú ý";
}

function fluencyStatus(value: Extract<PracticeResult, { mode: "GENERAL" }>["pronunciation"]) {
  if (!value.available || !value.fluency) return "Chưa có dữ liệu";
  return value.fluency === "CLEAR" ? "Khá tự nhiên" : "Cần liền mạch hơn";
}

function rhythmStatus(value: Extract<PracticeResult, { mode: "GENERAL" }>["pronunciation"]) {
  if (!value.available) return "Chưa có dữ liệu";
  if ((value.longPauseCount ?? 0) > 0) return "Còn ngắt quãng";
  if (!value.fluency) return "Chưa có dữ liệu";
  return value.fluency === "CLEAR" ? "Khá đều" : "Cần chú ý";
}

function generalPriority(result: Extract<PracticeResult, { mode: "GENERAL" }>): { text: string; source: "derived" | "improvement" | "nextStep" } {
  const pronunciation = result.pronunciation;
  if ((pronunciation.longPauseCount ?? 0) > 0) return { text: "Hạn chế dừng quá lâu giữa các ý. Thử nối 2–3 câu liên tục trước khi dừng.", source: "derived" };
  if (pronunciation.wordDetails.length > 0) return { text: "Luyện lại các từ chưa rõ, rồi dùng từng từ trong một câu ngắn.", source: "derived" };
  if ((pronunciation.fillerCount ?? 0) > 0) return { text: "Thay từ đệm bằng một nhịp nghỉ ngắn để câu nói gọn và tự tin hơn.", source: "derived" };
  if ((pronunciation.repetitionCount ?? 0) > 0) return { text: "Nói chậm lại một nhịp để tránh lặp từ hoặc cụm từ liền nhau.", source: "derived" };
  if (result.nextSteps[0]) return { text: result.nextSteps[0], source: "nextStep" };
  if (result.improvements[0]) return { text: result.improvements[0], source: "improvement" };
  return { text: "Giữ nhịp nói hiện tại và thử mở rộng mỗi câu trả lời thêm một ý.", source: "derived" };
}

function DeliveryFeedback({ value }: { value: Extract<PracticeResult, { mode: "GENERAL" }>["pronunciation"] }) {
  const pauses = value.longPauseCount ?? 0;
  const fillers = value.fillerCount ?? 0;
  const repetitions = value.repetitionCount ?? 0;
  const insight = !value.available
    ? "Chưa có đủ dữ liệu audio để nhận xét cách bạn thể hiện."
    : pauses > 0
      ? `Bạn có ${pauses} khoảng dừng dài. Thử nối 2–3 câu ngắn trước khi dừng.`
      : value.fluency === "CLEAR"
        ? "Bạn giữ nhịp nói khá liền mạch và không có khoảng dừng dài đáng chú ý."
        : "Nhịp nói còn hơi ngập ngừng. Thử chuẩn bị ý theo cụm trước khi bắt đầu.";
  return <section className="general-delivery" aria-labelledby="general-delivery-heading">
    <div className="general-section-heading"><span aria-hidden="true"><Gauge size={21} /></span><div><p>Cách bạn thể hiện</p><h2 id="general-delivery-heading">Nhịp nói và độ liền mạch</h2></div></div>
    <p className="general-delivery-insight">{insight}</p>
    {value.available && <dl className="general-delivery-metrics">
      {value.wpm != null && <div><dt>Tốc độ nói</dt><dd>{value.wpm} từ/phút</dd></div>}
      <div><dt>Khoảng dừng dài</dt><dd>{pauses}</dd></div>
      <div><dt>Từ đệm</dt><dd>{fillers}</dd></div>
      <div><dt>Lặp liền nhau</dt><dd>{repetitions}</dd></div>
    </dl>}
    {value.examples && value.examples.length > 0 && <p className="general-delivery-examples">Bạn có thể chú ý thêm: <span lang="en">{value.examples.join(", ")}</span></p>}
  </section>;
}

function GeneralCriteria({ criteria }: { criteria: NonNullable<Extract<PracticeResult, { mode: "GENERAL" }>["criteria"]> }) {
  return <section className="general-language" aria-labelledby="general-language-heading">
    <div className="general-section-heading"><span aria-hidden="true"><Sparkles size={21} /></span><div><p>Phản hồi ngôn ngữ</p><h2 id="general-language-heading">Diễn đạt rõ hơn ở lần tới</h2></div></div>
    <div className="general-language-list">
      <GeneralCriterion title="Độ trôi chảy & mạch lạc" value={criteria.fluencyCoherence} />
      <GeneralCriterion title="Từ vựng" value={criteria.lexicalResource} />
      <GeneralCriterion title="Ngữ pháp" value={criteria.grammaticalRangeAccuracy} />
    </div>
  </section>;
}

function GeneralCriterion({ title, value }: { title: string; value: CriterionFeedback }) {
  const { preview, remainder } = criterionSummary(value.summary);
  return <article className="general-language-item">
    <div className="general-language-title"><h3>{title}</h3><span>Nhận xét chính</span></div>
    <div className="general-language-copy"><p>{preview}</p>{remainder && <details><summary>Xem nhận xét đầy đủ</summary><p>{remainder}</p></details>}</div>
    {value.example && <div className="general-language-fix"><strong>1 điểm cần sửa</strong><p><span lang="en">“{value.example.original}”</span>{value.example.corrected && <> <ArrowRight size={15} aria-hidden="true" /> <span lang="en">“{value.example.corrected}”</span></>}</p></div>}
  </article>;
}

function criterionSummary(summary: string) {
  const trimmed = summary.trim();
  const firstSentence = trimmed.match(/^.*?[.!?](?:\s|$)/u)?.[0].trim();
  if (!firstSentence || firstSentence.length === trimmed.length) return { preview: trimmed, remainder: "" };
  return { preview: firstSentence, remainder: trimmed.slice(firstSentence.length).trim() };
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
