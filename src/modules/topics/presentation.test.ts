import { expect, it } from "vitest";
import { getTopicPresentation } from "./presentation";

it("provides contextual guidance and a vocabulary preview for a catalog topic", () => {
  expect(getTopicPresentation("travel", "Travel")).toEqual({
    context: "Luyện nói về kế hoạch, hành trình và những tình huống thường gặp khi đi du lịch.",
    vocabulary: ["itinerary", "accommodation", "get around"],
  });
});

it("keeps unknown future topics usable without inventing topic-specific vocabulary", () => {
  expect(getTopicPresentation("new-topic", "New Topic")).toEqual({
    context: "Luyện diễn đạt ý tưởng tự nhiên khi trò chuyện về New Topic.",
    vocabulary: [],
  });
});
