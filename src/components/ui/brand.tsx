import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="Speakora — Trang chủ" className="speakora-brand" href="/">
      <span aria-hidden="true" className="speakora-brand-mark">
        <svg fill="none" viewBox="0 0 32 32">
          <path d="M7 17.5v-3M12 22v-12M17 25V7M22 21.5v-11M27 17v-2" />
        </svg>
      </span>
      <span className="speakora-brand-copy">
        <strong>Speakora</strong>
        {!compact && <small>Luyện nói có mục tiêu</small>}
      </span>
    </Link>
  );
}
