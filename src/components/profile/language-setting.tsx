"use client";

import React, { useTransition } from "react";
import { Languages } from "lucide-react";
import { useLocale, useT } from "../../i18n/client";
import type { Locale } from "../../i18n/config";
import { setLocale } from "../../modules/profile/actions";

const options: { value: Locale; label: string; short: string }[] = [
  { value: "vi", label: "Tiếng Việt", short: "VI" },
  { value: "en", label: "English", short: "EN" },
];

/** Full row in Settings; `compact` is the VI | EN switch on the auth pages. */
export function LanguageSetting({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [pending, start] = useTransition();

  return (
    <div className={compact ? "language-setting is-compact" : "language-setting"} role="group" aria-label={t("Ngôn ngữ")}>
      {compact ? null : <div className="language-setting-copy">
        <strong><Languages aria-hidden="true" size={18} />{t("Ngôn ngữ")}</strong>
        <p>{t("Áp dụng cho giao diện và nhận xét từ AI. Nghĩa của từ vựng vẫn là tiếng Việt.")}</p>
      </div>}
      <div className="language-setting-options">
        {options.map((option) => (
          <button
            aria-pressed={locale === option.value}
            disabled={pending}
            key={option.value}
            lang={option.value}
            onClick={() => { if (locale !== option.value) start(() => setLocale(option.value)); }}
            type="button"
          >
            {compact ? option.short : option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
