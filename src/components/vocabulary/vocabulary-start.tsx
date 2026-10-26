"use client";

import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { LearnerLevel } from "../../modules/profile/types";
import { TopicIllustration } from "../topics/topic-illustration";
import { createVocabularyPracticeSession } from "./start-vocabulary-session";
import { topicDisplayName } from "../../modules/topics/display-name";

const levelLabels: Record<LearnerLevel, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

export type VocabularyTopicOption = {
  id: string;
  slug: string;
  name: string;
  levels: { level: LearnerLevel; count: number }[];
  totalCount: number;
};

export function VocabularyStart({
  topics,
  preferredSlug,
}: {
  topics: VocabularyTopicOption[];
  preferredSlug?: string;
}) {
  const router = useRouter();
  const preferred = preferredSlug
    ? topics.find((topic) => topic.slug === preferredSlug)
    : undefined;
  const [topicId, setTopicId] = useState(preferred?.id ?? topics[0]?.id ?? "");
  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === topicId) ?? preferred ?? topics[0],
    [topicId, topics, preferred],
  );
  const [level, setLevel] = useState<LearnerLevel>(selectedTopic?.levels[0]?.level ?? "BEGINNER");
  const [itemCount, setItemCount] = useState(10);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const availableLevels = selectedTopic?.levels ?? [];
  const levelCount = availableLevels.find((item) => item.level === level)?.count ?? 0;
  const maxCount = Math.min(20, Math.max(levelCount, 1));

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTopic) return;
    setPending(true);
    setError("");
    try {
      router.push(
        await createVocabularyPracticeSession(fetch, selectedTopic.id, level, Math.min(itemCount, levelCount)),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo phiên luyện từ vựng.");
      setPending(false);
    }
  }

  if (!topics.length) {
    return <p className="empty-state">Chưa có từ vựng sẵn sàng. Hãy chạy pipeline import vocabulary trước.</p>;
  }

  return (
    <form className="vocab-start" onSubmit={start}>
      <fieldset className="vocab-topic-fieldset" disabled={pending}>
        <legend>Chủ đề</legend>
        <div className="session-topic-grid vocab-topic-grid">
          {topics.map((topic) => (
            <label className="session-topic-choice" key={topic.id}>
              <input
                checked={selectedTopic?.id === topic.id}
                name="vocab-topic"
                onChange={() => {
                  setTopicId(topic.id);
                  if (topic.levels[0]) setLevel(topic.levels[0].level);
                }}
                type="radio"
                value={topic.id}
              />
              <span className="session-topic-card">
                <TopicIllustration name={topic.name} slug={topic.slug} />
                <span className="session-topic-copy"><strong>{topicDisplayName(topic.slug, topic.name)}</strong><small>{topic.totalCount} từ</small></span>
                <Check aria-hidden="true" className="session-topic-check" size={15} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="vocab-level-fieldset" disabled={pending}>
        <legend>Trình độ</legend>
        <div className="topic-level-grid">
          {availableLevels.map((item) => (
            <label className={level === item.level ? "selected" : ""} key={item.level}>
              <input
                checked={level === item.level}
                name="vocab-level"
                onChange={() => setLevel(item.level)}
                type="radio"
                value={item.level}
              />
              <strong>{levelLabels[item.level]}</strong>
              <span>{item.count} từ có sẵn</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="vocab-field">
        <span>Số từ trong phiên (1–{maxCount})</span>
        <input
          disabled={pending || levelCount === 0}
          max={maxCount}
          min={1}
          onChange={(event) => setItemCount(Number(event.target.value))}
          type="number"
          value={Math.min(itemCount, maxCount)}
        />
      </label>

      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary session-start-button" disabled={pending || levelCount === 0} type="submit">
        {pending ? "Đang tạo phiên…" : "Bắt đầu luyện từ vựng"}
      </button>
    </form>
  );
}
