import { expect, it } from "vitest";
import { safeReturnPath } from "./redirect";

it("accepts only local absolute paths", () => {
  expect(safeReturnPath("/dashboard?welcome=1")).toBe("/dashboard?welcome=1");
  expect(safeReturnPath("https://attacker.test")).toBe("/dashboard");
  expect(safeReturnPath("//attacker.test")).toBe("/dashboard");
  expect(safeReturnPath(null)).toBe("/dashboard");
});
