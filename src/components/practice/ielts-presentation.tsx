"use client";

import React from "react";
import { Headphones, Lightbulb, Mic, Send, CircleCheck, Target } from "lucide-react";
import type { AvatarState } from "./practice-avatar";
import type { RecorderState } from "./recorder";
import { useT } from "../../i18n/client";
import { msg } from "../../i18n/translate";

const examiner = {
  idle: { asset: "greeting", label: msg("Sẵn sàng lắng nghe") },
  speaking: { asset: "speaking", label: msg("Đang đọc câu hỏi") },
  listening: { asset: "listening", label: msg("Đang nghe bạn nói") },
  thinking: { asset: "thinking", label: msg("Đang xử lý câu trả lời") },
};

export function IeltsExaminer({ state }: { state: AvatarState }) {
  const t = useT();
  const view = examiner[state];
  return <figure className={`ielts-examiner ielts-examiner--${state}`}>
    <img src={`/images/ielts/examiner-${view.asset}.png`} alt={t("Giám khảo AI Speakora")} width={480} height={480} />
    <figcaption><span className="ielts-examiner-badge"><span aria-hidden="true" /> AI Examiner</span><span role="status">{t.dynamic(view.label)}</span></figcaption>
  </figure>;
}

export function IeltsFlow({ recorderState, playing }: { recorderState: RecorderState; playing: boolean }) {
  const t = useT();
  const active = recorderState === "uploading" ? 3 : recorderState === "review" ? 2 : recorderState === "recording" ? 1 : playing ? 0 : 1;
  const steps = [{ label: "Listen", Icon: Headphones }, { label: "Speak", Icon: Mic }, { label: "Review", Icon: CircleCheck }, { label: "Submit", Icon: Send }];
  return <ol className="ielts-flow" aria-label={t("Các bước trả lời")}>{steps.map(({ label, Icon }, index) =>
    <li key={label} aria-current={index === active ? "step" : undefined}><span><Icon size={17} aria-hidden="true" /></span>{label}</li>,
  )}</ol>;
}

const tips = [msg("Trả lời trực tiếp, sau đó mở rộng ý của bạn."), msg("Đưa ra một ví dụ liên quan từ trải nghiệm của bạn."), msg("Nói tự nhiên và giải thích rõ ý tưởng của bạn.")];

export function IeltsSessionInfo({ completed, total, current, part, status, children }: {
  completed: number; total: number; current: number; part?: string; status: string; children?: React.ReactNode;
}) {
  const t = useT();
  const percent = total > 0 ? Math.round(completed / total * 100) : 0;
  return <aside className="ielts-sidebar" aria-label={t("Thông tin phiên luyện")}>
    <section className="ielts-info-card">
      <div className="ielts-info-heading"><h2>{t("Tiến độ phiên luyện")}</h2><span>{t("Câu")} {current} / {total}</span></div>
      <div className="ps-progress" role="progressbar" aria-label={t("Câu trả lời đã gửi")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="ps-progress-fill" style={{ width: `${percent}%` }} /></div>
      <p className="ielts-progress-caption"><span>{completed}/{total} {t("câu đã gửi")}</span><strong>{percent}%</strong></p>
    </section>
    <section className="ielts-info-card"><h2><Target size={20} aria-hidden="true" />{t("Phiên luyện hiện tại")}</h2>
      <dl className="ielts-metadata"><div><dt>{t("Chế độ")}</dt><dd>IELTS Speaking</dd></div>{part && <div><dt>{t("Phần thi")}</dt><dd>{part}</dd></div>}<div><dt>{t("Trạng thái")}</dt><dd>{status}</dd></div></dl>
    </section>
    <section className="ielts-info-card ielts-tip"><h2><Lightbulb size={21} aria-hidden="true" />{t("Mẹo luyện nói")}</h2><p>{t.dynamic(tips[Math.max(0, current - 1) % tips.length])}</p><small>{t("Gợi ý chung · không phải đánh giá AI")}</small></section>
    {children}
  </aside>;
}
