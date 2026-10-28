import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { TopicIcon } from "./topic-icon";

it.each(["family", "food", "health", "home", "movies"])("maps database and-slugs to supplied filenames: %s", (prefix) => {
  const suffixes: Record<string, string> = { family: "friends", food: "cooking", health: "fitness", home: "neighborhood", movies: "music" };
  const html = renderToStaticMarkup(<TopicIcon slug={`${prefix}-and-${suffixes[prefix]}`} />);
  expect(html).toContain(`${prefix}-${suffixes[prefix]}.webp`);
});

it("uses the provided topic asset and keeps repeated topic imagery decorative", () => {
  const html = renderToStaticMarkup(<TopicIcon slug="travel" />);
  expect(html).toContain("travel.webp");
  expect(html).toContain('alt=""');
});

it("provides a safe fallback for new or unrecognized topics", () => {
  const html = renderToStaticMarkup(<TopicIcon slug="unknown-topic" />);
  expect(html).not.toContain("unknown-topic.webp");
  expect(html).toContain("svg");
});
