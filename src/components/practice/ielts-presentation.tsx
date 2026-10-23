import React from "react";
import { Headphones, Lightbulb, Mic, Send, CircleCheck, Target } from "lucide-react";
import type { AvatarState } from "./practice-avatar";
import type { RecorderState } from "./recorder";

const examiner = {
  idle: { asset: "greeting", label: "Sẵn sàng lắng nghe" },
  speaking: { asset: "speaking", label: "Đang đọc câu hỏi" },
  listening: { asset: "listening", label: "Đang nghe bạn nói" },
  thinking: { asset: "thinking", label: "Đang xử lý câu trả lời" },
};

export function IeltsExaminer({ state }: { state: AvatarState }) {
  const view = examiner[state];
  return <figure className={`ielts-examiner ielts-examiner--${state}`}>
    <img src={`/images/ielts/examiner-${view.asset}.png`} alt="Giám khảo AI Speakora" width={480} height={480} />
    <figcaption><span className="ielts-examiner-badge"><span aria-hidden="true" /> AI Examiner</span><span role="status">{view.label}</span></figcaption>
  </figure>;
}

export function IeltsFlow({ recorderState, playing }: { recorderState: RecorderState; playing: boolean }) {
  const active = recorderState === "uploading" ? 3 : recorderState === "review" ? 2 : recorderState === "recording" ? 1 : playing ? 0 : 1;
  const steps = [{ label: "Listen", Icon: Headphones }, { label: "Speak", Icon: Mic }, { label: "Review", Icon: CircleCheck }, { label: "Submit", Icon: Send }];
  return <ol className="ielts-flow" aria-label="Các bước trả lời">{steps.map(({ label, Icon }, index) =>
    <li key={label} aria-current={index === active ? "step" : undefined}><span><Icon size={17} aria-hidden="true" /></span>{label}</li>,
  )}</ol>;
}

const tips = ["Trả lời trực tiếp, sau đó mở rộng ý của bạn.", "Đưa ra một ví dụ liên quan từ trải nghiệm của bạn.", "Nói tự nhiên và giải thích rõ ý tưởng của bạn."];

export function IeltsSessionInfo({ completed, total, current, part, status, children }: {
  completed: number; total: number; current: number; part?: string; status: string; children?: React.ReactNode;
}) {
  const percent = total > 0 ? Math.round(completed / total * 100) : 0;
  return <aside className="ielts-sidebar" aria-label="Thông tin phiên luyện">
    <section className="ielts-info-card">
      <div className="ielts-info-heading"><h2>Tiến độ phiên luyện</h2><span>Câu {current} / {total}</span></div>
      <div className="ps-progress" role="progressbar" aria-label="Câu trả lời đã gửi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="ps-progress-fill" style={{ width: `${percent}%` }} /></div>
      <p className="ielts-progress-caption"><span>{completed}/{total} câu đã gửi</span><strong>{percent}%</strong></p>
    </section>
    <section className="ielts-info-card"><h2><Target size={20} aria-hidden="true" />Phiên luyện hiện tại</h2>
      <dl className="ielts-metadata"><div><dt>Chế độ</dt><dd>IELTS Speaking</dd></div>{part && <div><dt>Phần thi</dt><dd>{part}</dd></div>}<div><dt>Trạng thái</dt><dd>{status}</dd></div></dl>
    </section>
    <section className="ielts-info-card ielts-tip"><h2><Lightbulb size={21} aria-hidden="true" />Mẹo luyện nói</h2><p>{tips[Math.max(0, current - 1) % tips.length]}</p><small>Gợi ý chung · không phải đánh giá AI</small></section>
    {children}
  </aside>;
}
