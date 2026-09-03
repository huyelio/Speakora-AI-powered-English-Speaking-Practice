import { expect, it } from "vitest";
import { getTopicPresentation } from "./presentation";

it("provides contextual guidance and a vocabulary preview for a catalog topic", () => {
  expect(getTopicPresentation("travel", "Travel")).toEqual({
    context: "Practice handling travel plans, journeys, and common situations away from home.",
    vocabulary: ["itinerary", "accommodation", "get around"],
  });
});

it("keeps unknown future topics usable without inventing topic-specific vocabulary", () => {
  expect(getTopicPresentation("new-topic", "New Topic")).toEqual({
    context: "Practice expressing your ideas naturally in a conversation about New Topic.",
    vocabulary: [],
  });
});
