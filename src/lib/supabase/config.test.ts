import { expect, it } from "vitest";
import { getApplicationUrl, validateApplicationUrl } from "./config";

it("accepts HTTPS and localhost canonical application URLs", () => {
  expect(validateApplicationUrl("https://app.speakora.test/reset")).toBe(
    "https://app.speakora.test",
  );
  expect(validateApplicationUrl("http://localhost:3000")).toBe(
    "http://localhost:3000",
  );
});

it("rejects non-HTTPS non-localhost canonical application URLs", () => {
  expect(() => validateApplicationUrl("http://attacker.test")).toThrow(
    "APP_URL must be an HTTPS URL or use localhost.",
  );
});

it("uses only localhost as the development fallback", () => {
  expect(getApplicationUrl({ NODE_ENV: "development" })).toBe(
    "http://localhost:3000",
  );
  expect(() => getApplicationUrl({ NODE_ENV: "production" })).toThrow(
    "APP_URL is not configured.",
  );
});
