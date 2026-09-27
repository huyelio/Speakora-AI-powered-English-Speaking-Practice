import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

describe("Lingolix standalone runtime", () => {
  it("can be imported by the tsx-based background worker", () => {
    const moduleUrl = pathToFileURL(`${process.cwd()}/src/modules/pronunciation-analysis/lingolix.ts`).href;
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "--eval", `import(${JSON.stringify(moduleUrl)})`],
      { cwd: process.cwd(), encoding: "utf8" },
    );

    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
