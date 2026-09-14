import { describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { validateGeneralCoverage } from "./import-questions-csv.mjs";

const execFileAsync = promisify(execFile);

describe("validateGeneralCoverage", () => {
  it("returns a summary for five active General questions in one topic", () => {
    const rows = Array.from({ length: 5 }, (_, index) => ({
      mode: "GENERAL",
      topic: "travel",
      difficulty: index % 2 === 0 ? "BEGINNER" : "INTERMEDIATE",
      status: "ACTIVE",
      code: `GENERAL_TRAVEL_${index}`,
    }));

    expect(validateGeneralCoverage(rows)).toEqual([
      { topic: "travel", count: 5 },
    ]);
  });

  it("rejects an active General topic with fewer than five questions", () => {
    expect(() => validateGeneralCoverage([
      {
        mode: "GENERAL",
        topic: "travel",
        difficulty: "BEGINNER",
        status: "ACTIVE",
        code: "GENERAL_TRAVEL_B_1",
      },
    ])).toThrow("travel has 1 active question; minimum is 5");
  });

  it("counts mixed difficulty levels within the same topic together", () => {
    expect(validateGeneralCoverage([
      { mode: "GENERAL", topic: "travel", difficulty: "BEGINNER", status: "ACTIVE", code: "GENERAL_TRAVEL_B_1" },
      { mode: "GENERAL", topic: "travel", difficulty: "INTERMEDIATE", status: "ACTIVE", code: "GENERAL_TRAVEL_I_1" },
      { mode: "GENERAL", topic: "travel", difficulty: "BEGINNER", status: "ACTIVE", code: "GENERAL_TRAVEL_B_2" },
      { mode: "GENERAL", topic: "travel", difficulty: "INTERMEDIATE", status: "ACTIVE", code: "GENERAL_TRAVEL_I_2" },
      { mode: "GENERAL", topic: "travel", difficulty: "BEGINNER", status: "ACTIVE", code: "GENERAL_TRAVEL_B_3" },
    ])).toEqual([{ topic: "travel", count: 5 }]);
  });

  it("ignores non-General and non-active records", () => {
    expect(validateGeneralCoverage([
      { mode: "IELTS", topic: "travel", difficulty: "BEGINNER", status: "ACTIVE", code: "IELTS_A" },
      { mode: "GENERAL", topic: "travel", difficulty: "BEGINNER", status: "DRAFT", code: "GENERAL_A" },
    ])).toEqual([]);
  });
});

describe("importer module", () => {
  it("can be imported without evaluating the CLI when no script argument exists", async () => {
    const { stderr } = await execFileAsync(process.execPath, [
      "--input-type=module",
      "--eval",
      'import "./scripts/import-questions-csv.mjs";',
    ]);

    expect(stderr).toBe("");
  });
});
