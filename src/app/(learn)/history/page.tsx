import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRequestUser } from "../../../lib/supabase/auth-server";
import { decodeHistoryCursor, getHistory } from "../../../modules/dashboard/repository";

type SearchParams = { cursor?: string | string[] };

export const dynamic = "force-dynamic";

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
      <header className="page-heading"><p className="eyebrow">YOUR PRACTICE</p><h1>History</h1><p>Revisit protected recordings, transcripts, and feedback from your sessions.</p></header>
      {history.items.length ? (
        <div className="history-list">
          {history.items.map((item) => (
            <Link href={`/history/${item.id}`} key={item.id}>
              <span className="history-mode">{item.mode}</span>
              <span><strong>{item.topic?.name ?? `${item.mode} speaking`}</strong><small>{new Date(item.createdAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })} · {item.answerCount}/5 answers</small>{item.summary && <em>{item.summary}</em>}</span>
              <span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status.replaceAll("_", " ")}</span>
            </Link>
          ))}
        </div>
      ) : <section className="empty-state"><h2>No practice sessions yet</h2><p>Start with a General English topic and your session will be saved here.</p><Link className="primary" href="/explore">Explore topics</Link></section>}
      {history.nextCursor && <Link className="secondary pagination-link" href={`/history?cursor=${encodeURIComponent(history.nextCursor)}`}>Older sessions</Link>}
    </div>
  );
}
