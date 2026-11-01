"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import type { LearnerLevel } from "../../modules/profile/types";
import type { TopicLevelAvailability } from "../../modules/topics/types";
import { createTopicPracticeSession } from "./start-topic-session";
import { useT } from "../../i18n/client";
import { msg } from "../../i18n/translate";

const levelLabels: Record<LearnerLevel, string> = {
  BEGINNER: msg("Cơ bản"),
  INTERMEDIATE: msg("Trung cấp"),
  ADVANCED: msg("Nâng cao"),
};

export function TopicStart({
  topicId,
  levels,
  initialLevel,
}: {
  topicId: string;
  levels: TopicLevelAvailability[];
  /** Level filtered in the speaking hub; ignored when this topic does not offer it. */
  initialLevel?: LearnerLevel;
}) {
  const t = useT();
  const router = useRouter();
  const [level, setLevel] = useState<LearnerLevel>(
    levels.find((item) => item.level === initialLevel)?.level ?? levels[0]?.level ?? "BEGINNER",
  );
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
        : t("Không thể tạo phiên luyện. Vui lòng thử lại."));
      setPending(false);
    }
  }

  return (
    <form className="topic-start" onSubmit={start}>
      {levels.length === 1 ? (
        // A single level needs no choice step.
        <p className="topic-single-level">{t("Trình độ")} {t.dynamic(levelLabels[levels[0].level])} · {levels[0].count} {t("câu có sẵn")}</p>
      ) : (
      <fieldset disabled={pending}>
        <legend>{t("Chọn trình độ")}</legend>
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
              <strong>{t.dynamic(levelLabels[item.level])}</strong>
              <span>{item.count} {t("câu có sẵn")}</span>
            </label>
          ))}
        </div>
      </fieldset>
      )}
      {error && <p className="error" role="alert">{t.dynamic(error)}</p>}
      <button className="primary topic-start-button session-start-button" disabled={pending || levels.length === 0} type="submit">
        {pending ? t("Đang tạo phiên luyện…") : t("Bắt đầu 5 câu luyện nói")}
      </button>
    </form>
  );
}
