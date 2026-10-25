"use client";
export default function VocabularyLearningError({ reset }: { reset(): void }) {
  return <section className="card vl-answer"><h1>Chưa thể tải phiên học</h1><p role="alert">Hãy kiểm tra kết nối rồi thử lại. Tiến độ đã lưu vẫn được giữ.</p><button className="primary" onClick={reset}>Thử lại</button></section>;
}
