"use client";

import type { ReactNode } from "react";
import { Brand } from "../ui/brand";
import { TopicIcon } from "../ui/topic-icon";
import { useT } from "../../i18n/client";
import { LanguageSetting } from "../profile/language-setting";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  layout = "welcome",
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  layout?: "welcome";
}) {
  const t = useT();
  return (
    <main className="auth-shell" data-layout={layout}>
      <section aria-label={t("Giới thiệu Speakora")} className="auth-story">
        <Brand />
        {layout === "welcome" ? <>
          <div className="welcome-copy">
            <h2>{t("Mỗi cuộc trò chuyện")}<br />{t("đưa bạn tiến gần hơn")}<br />{t("tới phiên bản")} <span>{t("tự tin.")}</span></h2>
            <div className="welcome-accent" aria-hidden="true" />
            <p>{t("Luyện tiếng Anh qua những chủ đề gần gũi,")}<br />{t("thực tế mỗi ngày.")}</p>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <span className="welcome-orbit" />
            <div className="welcome-art-chat"><TopicIcon slug="social-situations" size={300} /></div>
            <div className="welcome-art-calendar"><TopicIcon slug="future-plans" size={152} /></div>
            <div className="welcome-art-study"><TopicIcon slug="study" size={150} /></div>
          </div>
        </> : <>
        <div className="auth-story-copy">
          <p className="auth-story-kicker">{t("LUYỆN NÓI CÓ ĐỊNH HƯỚNG")}</p>
          <h2>{t("Tự tin hơn trong từng cuộc trò chuyện.")}</h2>
          <p>
            {t("Luyện tập theo chủ đề, nhận phản hồi rõ ràng và duy trì nhịp học phù hợp với bạn.")}
          </p>
          <ul className="auth-benefits">
            <li><span aria-hidden="true">01</span> {t("Bài luyện ngắn, tập trung")}</li>
            <li><span aria-hidden="true">02</span> {t("Phản hồi dựa trên câu trả lời")}</li>
            <li><span aria-hidden="true">03</span> {t("Tiến bộ theo mục tiêu mỗi ngày")}</li>
          </ul>
        </div>
        <p className="auth-story-note">{t("Luyện Speaking theo tiến bộ của riêng bạn.")}</p>
        </>}
      </section>

      <section className="auth-panel">
        <LanguageSetting compact />
        <div className="auth-mobile-brand"><Brand compact /></div>
        <div className="auth-card">
          <header className="auth-card-header">
            <p className="auth-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </header>
          {children}
          {footer && <footer className="auth-card-footer">{footer}</footer>}
        </div>
        <p className="auth-privacy-note">{t("Bản ghi luyện nói của bạn được lưu trữ riêng tư.")}</p>
      </section>
    </main>
  );
}
