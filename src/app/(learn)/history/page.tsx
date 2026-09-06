import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { decodeHistoryCursor, getHistory } from "../../../modules/dashboard/repository";

type SearchParams = { cursor?: string | string[] };

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  CREATED: "Đã tạo",
  IN_PROGRESS: "Đang luyện tập",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  FAILED: "Có lỗi",
};

export default async function HistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getRequestUser();
  if (!user) redirect("/auth/sign-in?next=/history");
  const raw = (await searchParams).cursor;
  const cursorValue = Array.isArray(raw) ? raw[0] : raw;
  let cursor;
  try {
    cursor = cursorValue ? decodeHistoryCursor(cursorValue) : undefined;
  } catch {
    notFound();
  }
  const history = await getHistory(user.id, { cursor });

  return (
    <div className="history-page">
      <header className="page-heading"><p className="eyebrow">QUÁ TRÌNH LUYỆN TẬP</p><h1>Lịch sử</h1><p>Xem lại bản ghi âm, transcript và nhận xét từ các phiên đã luyện.</p></header>
      {history.items.length ? (
        <div className="history-list">
          {history.items.map((item) => (
            <Link href={`/history/${item.id}`} key={item.id}>
              <span className="history-mode">{item.mode}</span>
              <span><strong>{item.topic?.name ?? `${item.mode} Speaking`}</strong><small>{new Date(item.createdAt).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" })} · {item.answerCount}/5 câu</small>{item.summary && <em>{item.summary}</em>}</span>
              <span className={`status-badge status-${item.status.toLowerCase()}`}>{statusLabels[item.status] ?? item.status}</span>
            </Link>
          ))}
        </div>
      ) : <section className="empty-state"><h2>Chưa có phiên luyện tập</h2><p>Hãy bắt đầu với một chủ đề General English. Kết quả sẽ được lưu tại đây.</p><Link className="primary" href="/explore">Khám phá chủ đề</Link></section>}
      {history.nextCursor && <Link className="secondary pagination-link" href={`/history?cursor=${encodeURIComponent(history.nextCursor)}`}>Xem các phiên trước</Link>}
    </div>
  );
}
