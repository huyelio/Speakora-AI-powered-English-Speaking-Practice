"use client";
import { useT } from "../../../i18n/client";
export default function VocabularyLearningError({ reset }: { reset(): void }) {
  const t = useT();
  return <section className="card vl-answer"><h1>{t("Chưa thể tải phiên học")}</h1><p role="alert">{t("Hãy kiểm tra kết nối rồi thử lại. Tiến độ đã lưu vẫn được giữ.")}</p><button className="primary" onClick={reset}>{t("Thử lại")}</button></section>;
}
