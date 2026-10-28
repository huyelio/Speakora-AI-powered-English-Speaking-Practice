import Link from "next/link";
import Image from "next/image";
import React from "react";

/** Text wordmark for the A5 app shell; the raster logo stays on auth surfaces. */
export function Wordmark({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link aria-label="Speakora — Trang chủ" className="a5-wordmark" href={href}>
      <span className="a5-wordmark-sun" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </span>
      speakora
    </Link>
  );
}

export function Brand({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <Link aria-label="Speakora — Trang chủ" className={`speakora-brand asset-brand${compact ? " asset-brand-compact" : ""}`} href={href}>
      <Image className="brand-image" src="/images/brand/logo.png" alt="Speakora" width={180} height={120} sizes={compact ? "96px" : "150px"} />
    </Link>
  );
}
