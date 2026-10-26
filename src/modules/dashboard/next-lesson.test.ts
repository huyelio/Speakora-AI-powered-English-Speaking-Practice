import { describe, expect, it } from "vitest";
import { chooseNextLesson } from "./next-lesson";

const resume = { sessionId: "3f1c", topicSlug: "travel", topicName: "Travel", stage: "RECALL" as const, cursor: 2, total: 6 };
const recommendation = { slug: "shopping", name: "Shopping", level: "BEGINNER" as const };

describe("chooseNextLesson", () => {
  it("resumes the unfinished vocabulary session before any recommendation", () => {
    expect(chooseNextLesson({ resume, recommendation })).toEqual({
      kind: "resume",
      href: "/vocabulary-learning/3f1c",
      topicSlug: "travel",
      topicName: "Travel",
      stage: "RECALL",
      stageIndex: 2,
      position: 3,
      total: 6,
    });
  });

  it("clamps the position to the stage size", () => {
    const lesson = chooseNextLesson({ resume: { ...resume, cursor: 9 }, recommendation: null });
    expect(lesson.kind === "resume" && lesson.position).toBe(6);
    const empty = chooseNextLesson({ resume: { ...resume, stage: "CONTEXT", total: 0 }, recommendation: null });
    expect(empty.kind === "resume" && empty.position).toBe(0);
  });

  it("falls back to the top topic recommendation", () => {
    expect(chooseNextLesson({ resume: null, recommendation })).toEqual({
      kind: "topic",
      href: "/topics/shopping?level=BEGINNER",
      topicSlug: "shopping",
      topicName: "Shopping",
      level: "BEGINNER",
    });
  });

  it("offers a fresh vocabulary session when nothing can be recommended", () => {
    expect(chooseNextLesson({ resume: null, recommendation: null })).toEqual({ kind: "start", href: "/vocabulary?mode=learn" });
  });
});
