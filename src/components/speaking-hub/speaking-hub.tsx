"use client";

import React from "react";
import { TopicGrid } from "../topics/topic-grid";
import type { LearnerLevel } from "../../modules/profile/types";
import type { TopicSummary } from "../../modules/topics/types";
import "./speaking-hub.css";
import { useT } from "../../i18n/client";

export type SpeakingHubProps = {
  topics: TopicSummary[];
  search: string;
  level?: LearnerLevel;
  invalidLevel?: boolean;
};

/** Speaking hub: topic questions. AI role-play has its own section at /conversation. */
export function SpeakingHub({ topics, search, level, invalidLevel }: SpeakingHubProps) {
  const t = useT();
  return (
    <div className="a5-speak">
      <header className="a5-hub-head">
        <h1>{t("Luyện nói")} <i>{t("mỗi ngày")}</i></h1>
        <p>{t("Chọn một chủ đề, trả lời câu hỏi và nhận nhận xét từ AI.")}</p>
      </header>
      <section aria-label={t("Theo chủ đề")} className="explore-page session-setup-page a5-speak-topics">
        <form className="explore-filters a5-filters" action="/speaking">
          <label htmlFor="topic-search">{t("Tìm chủ đề")}</label>
          <input defaultValue={search} id="topic-search" name="search" placeholder="Travel, work, food…" type="search" />
          <label htmlFor="topic-level">{t("Trình độ")}</label>
          <select defaultValue={level ?? ""} id="topic-level" name="level">
            <option value="">{t("Tất cả trình độ")}</option>
            <option value="BEGINNER">{t("Cơ bản")}</option>
            <option value="INTERMEDIATE">{t("Trung cấp")}</option>
            <option value="ADVANCED">{t("Nâng cao")}</option>
          </select>
          <button className="a5-btn" type="submit">{t("Lọc chủ đề")}</button>
        </form>
        {invalidLevel ? <p className="error" role="alert">{t("Hãy chọn trình độ Cơ bản, Trung cấp hoặc Nâng cao.")}</p> : null}
        <TopicGrid level={level} topics={topics} />
      </section>
    </div>
  );
}
