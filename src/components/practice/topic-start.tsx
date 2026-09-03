"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import type { LearnerLevel } from "../../modules/profile/types";
import type { TopicLevelAvailability } from "../../modules/topics/types";
import { createTopicPracticeSession } from "./start-topic-session";

const levelLabels: Record<LearnerLevel, string> = {
  BEGINNER: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  ADVANCED: "Nâng cao",
};

export function TopicStart({
  topicId,
  levels,
}: {
  topicId: string;
  levels: TopicLevelAvailability[];
}) {
  const router = useRouter();
  const [level, setLevel] = useState<LearnerLevel>(levels[0]?.level ?? "BEGINNER");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      router.push(await createTopicPracticeSession(fetch, topicId, level));
    } catch (reason) {
      setError(reason instanceof Error
        ? reason.message
        : "Không thể tạo phiên luyện. Vui lòng thử lại.");
      setPending(false);
    }
  }

  return (
    <form className="topic-start" onSubmit={start}>
      <fieldset disabled={pending}>
        <legend>Chọn trình độ</legend>
        <div className="topic-level-grid">
          {levels.map((item) => (
            <label className={level === item.level ? "selected" : ""} key={item.level}>
              <input
                checked={level === item.level}
                name="difficulty"
                onChange={() => setLevel(item.level)}
                type="radio"
                value={item.level}
              />
              <strong>{levelLabels[item.level]}</strong>
              <span>{item.count} câu có sẵn</span>
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary topic-start-button" disabled={pending || levels.length === 0} type="submit">
        {pending ? "Đang tạo phiên luyện…" : "Bắt đầu 5 câu luyện nói"}
      </button>
    </form>
  );
}
