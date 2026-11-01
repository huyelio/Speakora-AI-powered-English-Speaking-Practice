import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { decodeHistoryCursor, getHistory } from "../../../modules/dashboard/repository";
import { topicDisplayName } from "../../../modules/topics/display-name";
import { getLocale, getT } from "../../../i18n/server";
import { msg } from "../../../i18n/translate";
import { intlLocale, type Locale } from "../../../i18n/config";

type SearchParams = { cursor?: string | string[] };

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  CREATED: msg("Đã tạo"),
  IN_PROGRESS: msg("Đang luyện tập"),
  PROCESSING: msg("Đang xử lý"),
  COMPLETED: msg("Hoàn thành"),
  FAILED: msg("Có lỗi"),
};

const formatDate = (value: string, locale: Locale) => new Date(value).toLocaleString(intlLocale(locale), { dateStyle: "medium", timeStyle: "short" });

export default async function HistoryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const t = await getT();
  const locale = await getLocale();
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
      <header className="page-heading"><p className="eyebrow">{t("QUÁ TRÌNH LUYỆN TẬP")}</p><h1>{t("Lịch sử")}</h1><p>{t("Xem lại bản ghi âm, transcript và nhận xét từ các phiên luyện nói và hội thoại AI.")}</p></header>
      {history.items.length ? (
        <div className="history-list">
          {history.items.map((item) => item.kind === "CONVERSATION" ? (
            // A role-play reopens in its session screen, which shows the saved result.
            <Link href={`/conversation/session?session=${item.id}`} key={item.id}>
              <span className="history-mode">{t("Hội thoại")}</span>
              <span><strong lang="en">{item.title}</strong><small>{formatDate(item.createdAt, locale)} · {item.turnCount} {t("lượt nói ·")} {item.goalsCompleted}/{item.goalsTotal} {t("mục tiêu")}{item.stars ? ` · ${"★".repeat(item.stars)}${"☆".repeat(3 - item.stars)}` : ""}</small>{item.summary && <em>{item.summary}</em>}</span>
              <span className={`status-badge status-${item.status.toLowerCase()}`}>{t.dynamic(statusLabels[item.status]) ?? item.status}</span>
            </Link>
          ) : (
            <Link href={`/history/${item.id}`} key={item.id}>
              <span className="history-mode">{item.mode === "IELTS" ? "IELTS" : t("Chủ đề")}</span>
              <span><strong>{item.topic ? t.dynamic(topicDisplayName(item.topic.slug, item.topic.name)) : item.mode === "IELTS" ? t("Luyện thi IELTS") : t("Luyện nói")}</strong><small>{formatDate(item.createdAt, locale)} · {item.answerCount}{t("/5 câu")}</small>{item.summary && <em>{item.summary}</em>}</span>
              <span className={`status-badge status-${item.status.toLowerCase()}`}>{t.dynamic(statusLabels[item.status]) ?? item.status}</span>
            </Link>
          ))}
        </div>
      ) : <section className="empty-state"><h2>{t("Chưa có phiên luyện tập")}</h2><p>{t("Hãy bắt đầu với một chủ đề luyện nói. Kết quả sẽ được lưu tại đây.")}</p><Link className="primary" href="/speaking?tab=topics">{t("Chọn chủ đề luyện nói")}</Link></section>}
      {history.nextCursor && <Link className="secondary pagination-link" href={`/history?cursor=${encodeURIComponent(history.nextCursor)}`}>{t("Xem các phiên trước")}</Link>}
    </div>
  );
}
