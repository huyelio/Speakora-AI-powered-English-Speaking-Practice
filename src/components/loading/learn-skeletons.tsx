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

export function VocabularySkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="skel-page vocabulary-page">
      <span className="visually-hidden">Đang tải luyện từ vựng…</span>
      <div className="skel-heading">
        <Bone className="skel-eyebrow" />
        <Bone className="skel-title" />
        <Bone className="skel-lead" />
      </div>
      <div className="skel-vocab-panel">
        <Bone className="skel-section-title" />
        <Bone className="skel-input" />
        <div className="skel-grid-3">
          <Bone className="skel-card skel-card-sm" />
          <Bone className="skel-card skel-card-sm" />
          <Bone className="skel-card skel-card-sm" />
        </div>
        <Bone className="skel-input skel-input-sm" />
        <Bone className="skel-cta" />
      </div>
    </div>
  );
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
