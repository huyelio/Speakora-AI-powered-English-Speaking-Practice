import { describe, expect, it } from "vitest";
import { acceptLabels } from "./label-cefr.mjs";

const batch = [{ id: "a" }, { id: "b" }];

describe("acceptLabels", () => {
  it("keeps valid labels", () => {
    expect(acceptLabels(batch, [{ index: 0, cefr_level: "A2" }, { index: 1, cefr_level: "C2" }]))
      .toEqual([{ id: "a", cefrLevel: "A2" }, { id: "b", cefrLevel: "C2" }]);
  });

  it("drops unknown labels and indexes", () => {
    expect(acceptLabels(batch, [{ index: 0, cefr_level: "D1" }, { index: 7, cefr_level: "A1" }])).toEqual([]);
  });
});
