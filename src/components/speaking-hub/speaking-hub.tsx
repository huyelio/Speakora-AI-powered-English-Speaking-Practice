import React from "react";
import { ScenarioCatalog } from "../conversation/scenario-catalog";
import { SpeakingTabs } from "../conversation/speaking-tabs";
import { TopicGrid } from "../topics/topic-grid";
import type { LearnerLevel } from "../../modules/profile/types";
import type { TopicSummary } from "../../modules/topics/types";
import "./speaking-hub.css";

export type SpeakingTab = "topics" | "roleplay";

export function parseSpeakingTab(value: string | string[] | undefined): SpeakingTab {
  return (Array.isArray(value) ? value[0] : value) === "roleplay" ? "roleplay" : "topics";
}

export type SpeakingHubProps = {
  tab: SpeakingTab;
  topics: TopicSummary[];
  search: string;
  level?: LearnerLevel;
  invalidLevel?: boolean;
};

/** Speaking hub: topic questions and AI role-play side by side under one route. */
export function SpeakingHub({ tab, topics, search, level, invalidLevel }: SpeakingHubProps) {
  return (
    <div className="a5-speak">
      <header className="a5-hub-head">
        <h1>Luyện nói <i>mỗi ngày</i></h1>
        <p>Trả lời câu hỏi theo chủ đề, hoặc đóng vai trong một tình huống với AI.</p>
      </header>
      <SpeakingTabs active={tab} />

      {tab === "topics" ? (
        <section aria-label="Theo chủ đề" className="explore-page session-setup-page a5-speak-topics">
          <form className="explore-filters a5-filters" action="/speaking">
            <input name="tab" type="hidden" value="topics" />
            <label htmlFor="topic-search">Tìm chủ đề</label>
            <input defaultValue={search} id="topic-search" name="search" placeholder="Travel, work, food…" type="search" />
            <label htmlFor="topic-level">Trình độ</label>
            <select defaultValue={level ?? ""} id="topic-level" name="level">
              <option value="">Tất cả trình độ</option>
              <option value="BEGINNER">Cơ bản</option>
              <option value="INTERMEDIATE">Trung cấp</option>
              <option value="ADVANCED">Nâng cao</option>
            </select>
            <button className="a5-btn" type="submit">Lọc chủ đề</button>
          </form>
          {invalidLevel ? <p className="error" role="alert">Hãy chọn trình độ Cơ bản, Trung cấp hoặc Nâng cao.</p> : null}
          <TopicGrid level={level} topics={topics} />
        </section>
      ) : (
        <ScenarioCatalog />
      )}
    </div>
  );
}
