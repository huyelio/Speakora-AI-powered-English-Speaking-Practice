import "../vocabulary-hub/vocabulary-hub.css";
import "../session-frame/session-frame.css";

function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skel-bone ${className}`.trim()} />;
}

export function DefaultLearnSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="skel-page">
      <span className="visually-hidden">Đang tải…</span>
      <div className="skel-heading">
        <Bone className="skel-eyebrow" />
        <Bone className="skel-title" />
        <Bone className="skel-lead" />
      </div>
      <Bone className="skel-block skel-block-lg" />
      <div className="skel-grid-2">
        <Bone className="skel-card" />
        <Bone className="skel-card" />
      </div>
      <Bone className="skel-block" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="skel-page dashboard-page">
      <span className="visually-hidden">Đang tải trang chủ…</span>
      <div className="skel-heading">
        <Bone className="skel-eyebrow" />
        <Bone className="skel-title skel-title-wide" />
        <Bone className="skel-lead" />
      </div>
      <Bone className="skel-block skel-goal" />
      <Bone className="skel-cta" />
      <div className="skel-grid-2">
        <Bone className="skel-card skel-card-sm" />
        <Bone className="skel-card skel-card-sm" />
      </div>
      <div className="skel-section">
        <Bone className="skel-section-title" />
        <div className="skel-list">
          <Bone className="skel-list-row" />
          <Bone className="skel-list-row" />
          <Bone className="skel-list-row" />
        </div>
      </div>
      <div className="skel-mode-grid">
        <Bone className="skel-mode-card" />
        <Bone className="skel-mode-card" />
        <Bone className="skel-mode-card" />
        <Bone className="skel-mode-card" />
        <Bone className="skel-mode-card" />
      </div>
    </div>
  );
}

export function ExploreSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="skel-page explore-page">
      <span className="visually-hidden">Đang tải khám phá…</span>
      <div className="skel-heading">
        <Bone className="skel-eyebrow" />
        <Bone className="skel-title" />
        <Bone className="skel-lead" />
      </div>
      <div className="skel-filters">
        <Bone className="skel-input" />
        <Bone className="skel-input skel-input-sm" />
        <Bone className="skel-cta skel-cta-sm" />
      </div>
      <div className="skel-topic-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <Bone className="skel-topic-card" key={index} />
        ))}
      </div>
    </div>
  );
}

/** Same frame as the topic-first hub: the static heading renders for real, so nothing shifts. */
export function VocabularySkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="a5-vocab">
      <span className="visually-hidden">Đang tải chủ đề từ vựng…</span>
      <header className="a5-hub-head">
        <h1>Từ vựng <i>mỗi ngày</i></h1>
        <p>Chọn một chủ đề. Mỗi phiên gồm làm quen, phát âm và nhớ lại từ.</p>
      </header>
      <div className="a5-section-head"><h2>Chủ đề</h2></div>
      <ul className="vh-topics" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => <li key={index}><span className="vh-topic vh-topic-skel"><Bone className="vh-skel-icon" /><Bone className="skel-lead" /><Bone className="vh-skel-line" /></span></li>)}
      </ul>
    </div>
  );
}

export function VocabularyTopicSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="a5-vocab vt-page">
      <span className="visually-hidden">Đang tải chủ đề…</span>
      <span className="back-link vt-back">Từ vựng</span>
      <div className="vt-head"><Bone className="vh-skel-icon vh-skel-icon-lg" /><div className="skel-heading"><Bone className="skel-eyebrow" /><Bone className="skel-title" /><Bone className="skel-lead" /></div></div>
      <div className="a5-panel vt-next"><Bone className="skel-cta" /><Bone className="skel-lead" /></div>
      <div className="a5-section"><Bone className="skel-title" /><Bone className="skel-block" /></div>
    </div>
  );
}

/** Vocabulary Learning V2 session in the A5 frame: exit and steps, word card with side box, action bar. */
export function LearningSessionSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="vl-session a5-session">
      <span className="visually-hidden">Đang tải phiên học…</span>
      <div className="a5-session-top">
        <span className="a5-round" aria-hidden="true" />
        <ul className="a5-chips vl-stages" aria-hidden="true">{["Làm quen", "Phát âm", "Nhớ từ", "Ngữ cảnh", "Tổng kết"].map(label => <li key={label}>{label}</li>)}</ul>
      </div>
      <div className="a5-session-body">
        <div className="a5-session-main">
          <section className="card vl-word"><Bone className="skel-eyebrow vl-skel-center" /><Bone className="skel-title vl-skel-center" /><Bone className="skel-lead vl-skel-center" /><Bone className="skel-block" /></section>
        </div>
        <div className="a5-session-side"><div className="a5-box"><Bone className="skel-lead" /><Bone className="vh-skel-line" /></div></div>
      </div>
      <div className="a5-session-actions" aria-hidden="true"><Bone className="skel-cta-sm" /><Bone className="skel-cta-sm" /></div>
    </div>
  );
}

/** Flashcard session: progress row, bar and one card face. */
export function FlashcardSessionSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="vocabulary-session-page">
      <span className="visually-hidden">Đang tải thẻ từ…</span>
      <Bone className="skel-eyebrow" />
      <div className="vocab-session">
        <div className="vocab-progress-row"><Bone className="skel-eyebrow" /><Bone className="skel-eyebrow" /></div>
        <div className="vocab-progress" aria-hidden="true" />
        <Bone className="skel-block vocab-skel-card" />
      </div>
    </div>
  );
}

export function PronunciationSkeleton() {
  return <div aria-busy="true" aria-live="polite" className="skel-page pron-page">
    <span className="visually-hidden">Đang tải luyện phát âm…</span>
    <div className="skel-heading"><Bone className="skel-eyebrow" /><Bone className="skel-title" /><Bone className="skel-lead" /></div>
    <div className="pron-card card"><Bone className="skel-title" /><Bone className="skel-lead" /><Bone className="skel-cta" /><Bone className="skel-block" /><Bone className="skel-cta" /></div>
  </div>;
}

export function HistorySkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="skel-page">
      <span className="visually-hidden">Đang tải lịch sử…</span>
      <div className="skel-heading">
        <Bone className="skel-eyebrow" />
        <Bone className="skel-title" />
        <Bone className="skel-lead" />
      </div>
      <div className="skel-list">
        {Array.from({ length: 5 }, (_, index) => (
          <Bone className="skel-list-row skel-list-row-lg" key={index} />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="skel-page">
      <span className="visually-hidden">Đang tải hồ sơ…</span>
      <div className="skel-heading">
        <Bone className="skel-eyebrow" />
        <Bone className="skel-title" />
        <Bone className="skel-lead" />
      </div>
      <div className="skel-grid-2">
        <Bone className="skel-card" />
        <Bone className="skel-card" />
      </div>
      <Bone className="skel-block" />
    </div>
  );
}
