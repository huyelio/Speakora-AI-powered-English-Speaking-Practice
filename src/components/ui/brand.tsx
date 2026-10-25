import Link from "next/link";
import Image from "next/image";
import React from "react";

export function Brand({ compact = false, href = "/" }: { compact?: boolean; href?: string }) {
  return (
    <Link aria-label="Speakora — Trang chủ" className={`speakora-brand asset-brand${compact ? " asset-brand-compact" : ""}`} href={href}>
      <Image className="brand-image" src="/images/brand/logo.png" alt="Speakora" width={180} height={120} sizes={compact ? "96px" : "150px"} />
    </Link>
  );
}
