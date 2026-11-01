"use client";

import React from "react";
import Link from "next/link";
import { Eye, EyeOff, Trophy } from "lucide-react";
import type { LeaderboardRow, WeeklyLeaderboard } from "../../modules/leaderboard/board";
import "./leaderboard.css";
import { useLocale, useT } from "../../i18n/client";
import { msg } from "../../i18n/translate";
import { intlLocale, type Locale } from "../../i18n/config";

const dayFormat = (locale: Locale) => new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
const DAY_MS = 86_400_000;

/** "27/10 – 2/11": the week's Monday to its Sunday. */
export function weekRange(board: Pick<WeeklyLeaderboard, "weekStart" | "weekEnd">, locale: Locale = "vi") {
  return `${dayFormat(locale).format(new Date(board.weekStart))} – ${dayFormat(locale).format(new Date(Date.parse(board.weekEnd) - DAY_MS))}`;
}

const xpRules: [string, string][] = [
  ["+10", msg("mỗi câu trả lời luyện nói")],
  ["+25", msg("hoàn thành một phiên luyện nói")],
  ["+25", msg("hoàn thành một hội thoại AI (từ 3 lượt)")],
  ["+30", msg("đạt mục tiêu trong ngày")],
];

function Row({ row }: { row: LeaderboardRow }) {
  const t = useT();
  return (
    <li className={row.isViewer ? "is-viewer" : undefined}>
      <span className="a5-rank">{row.position}</span>
      <strong>{row.displayName}{row.isViewer ? <small> {t("· Bạn")}</small> : null}</strong>
      <span className="a5-board-xp">{row.xp} XP</span>
    </li>
  );
}

export function LeaderboardView({ board, now, onVisibility }: { board: WeeklyLeaderboard; now: Date; onVisibility: (formData: FormData) => Promise<void> }) {
  const t = useT();
  const locale = useLocale();
  const podium = board.rows.filter((row) => row.listIndex <= 3);
  const rest = board.rows.filter((row) => row.listIndex > 3);
  const daysLeft = Math.max(1, Math.ceil((Date.parse(board.weekEnd) - now.getTime()) / DAY_MS));
  const thisWeek = board.weeksAgo === 0;

  return (
    <div className="a5-board">
      <header className="a5-board-head">
        <h1>{t("Bảng xếp hạng tuần")}</h1>
        <p>{weekRange(board, locale)} · {thisWeek ? t("làm mới sau {0} ngày", daysLeft) : t("đã kết thúc")} · {board.participants} {t("người tham gia")}</p>
      </header>
      <nav className="a5-mode-tabs" aria-label={t("Chọn tuần")}>
        <Link href="/leaderboard" aria-current={thisWeek ? "page" : undefined}>{t("Tuần này")}</Link>
        <Link href="/leaderboard?week=last" aria-current={thisWeek ? undefined : "page"}>{t("Tuần trước")}</Link>
      </nav>

      <div className="a5-board-grid">
        <div className="a5-board-main">
          <p className="a5-board-me" role="status">
            {!board.visible ? t("Bạn đang ẩn khỏi bảng xếp hạng.")
              : board.viewer ? <>{thisWeek ? t("Bạn đang") : t("Bạn đã")} <strong>{t("hạng")} {board.viewer.position}</strong> {t("với")} {board.viewer.xp} XP{board.next ? <> {t("· còn")} <strong>{board.next.gap} XP</strong> {t("để vượt")} {board.next.displayName}</> : board.viewer.position === 1 ? t("· đang dẫn đầu!") : null}</>
              : thisWeek ? t("Bạn chưa có XP tuần này. Trả lời một câu luyện nói để lên bảng.") : t("Tuần trước bạn chưa có XP.")}
          </p>

          {board.rows.length ? <>
            <ol className="a5-podium" aria-label={t("Ba hạng đầu")}>
              {podium.map((row) => (
                <li key={row.listIndex} className={`a5-podium-${row.listIndex}${row.isViewer ? " is-viewer" : ""}`}>
                  <span className="a5-podium-medal" aria-hidden="true">{row.position}</span>
                  <strong>{row.displayName}</strong>
                  <span>{row.xp} XP</span>
                  <span className="a5-podium-step" aria-label={t("Hạng {0}", row.position)} />
                </li>
              ))}
            </ol>
            {rest.length ? <ol className="a5-board-list">
              {rest.map((row, index) => (
                <React.Fragment key={row.listIndex}>
                  {index > 0 && row.listIndex > rest[index - 1].listIndex + 1 ? <li className="a5-board-gap" aria-hidden="true">…</li> : null}
                  <Row row={row} />
                </React.Fragment>
              ))}
            </ol> : null}
          </> : <section className="a5-panel a5-board-empty"><Trophy size={36} aria-hidden="true" /><p>{thisWeek ? t("Chưa ai có XP tuần này. Hãy là người đầu tiên!") : t("Tuần trước chưa có ai trên bảng.")}</p></section>}
        </div>

        <aside className="a5-board-side">
          <section className="a5-panel">
            <h2>{t("Cách nhận XP")}</h2>
            <ul className="a5-board-rules">{xpRules.map(([xp, label]) => <li key={label}><strong>{xp}</strong>{t.dynamic(label)}</li>)}</ul>
            <p>{t("XP tuần tính từ 0:00 thứ Hai (giờ Việt Nam).")}</p>
          </section>
          <form className="a5-panel a5-board-privacy" action={onVisibility}>
            <h2>{t("Hiển thị")}</h2>
            <p>{board.visible ? t("Tên hiển thị của bạn đang xuất hiện trên bảng xếp hạng.") : t("Bạn đang ẩn. Bạn vẫn nhận XP như bình thường.")}</p>
            <input type="hidden" name="visible" value={board.visible ? "false" : "true"} />
            <button className="a5-btn a5-btn-ghost a5-btn-sm" type="submit">
              {board.visible ? <><EyeOff size={18} aria-hidden="true" />{t("Ẩn tôi khỏi bảng")}</> : <><Eye size={18} aria-hidden="true" />{t("Hiện tôi trên bảng")}</>}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

/** Home card: the viewer's weekly rank and the gap to the next learner. Hidden when the viewer opted out. */
export function LeaderboardCard({ board }: { board: WeeklyLeaderboard }) {
  const t = useT();
  if (!board.visible) return null;
  return (
    <Link className="a5-board-card" href="/leaderboard">
      <span className="a5-board-card-icon" aria-hidden="true"><Trophy size={26} /></span>
      <span>
        <strong>{board.viewer ? t("Hạng {0} tuần này · {1} XP", board.viewer.position, board.viewer.xp) : t("Bảng xếp hạng tuần")}</strong>
        <small>{board.viewer
          ? board.next ? t("Còn {0} XP để vượt {1}", board.next.gap, board.next.displayName) : board.viewer.position === 1 ? t("Bạn đang dẫn đầu tuần này") : t("Giữ phong độ nhé")
          : t("Trả lời một câu luyện nói để lên bảng")}</small>
      </span>
      <span className="a5-text-link">{t("Xem bảng")}</span>
    </Link>
  );
}
