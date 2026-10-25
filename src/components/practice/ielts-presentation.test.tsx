import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { IeltsExaminer, IeltsFlow, IeltsSessionInfo } from "./ielts-presentation";

it("shows examiner speaking only when question audio is playing", () => {
  const idle = renderToStaticMarkup(<IeltsExaminer state="idle" />);
  const speaking = renderToStaticMarkup(<IeltsExaminer state="speaking" />);
  expect(idle).toContain("examiner-greeting.png");
  expect(idle).not.toContain("Đang đọc câu hỏi");
  expect(speaking).toContain("examiner-speaking.png");
  expect(speaking).toContain("Đang đọc câu hỏi");
});

it.each([ ["idle", false, "Speak"], ["idle", true, "Listen"], ["recording", false, "Speak"], ["review", false, "Review"], ["uploading", false, "Submit"] ] as const)(
  "maps %s and playback %s to the supported flow", (recorderState, playing, label) => {
    const html = renderToStaticMarkup(<IeltsFlow recorderState={recorderState} playing={playing} />);
    const activeStep = html.match(/<li aria-current="step">(.*?)<\/li>/)?.[1];
    expect(activeStep).toContain(`${label}`);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
  },
);

it("counts accepted answers rather than the question currently displayed", () => {
  const html = renderToStaticMarkup(<IeltsSessionInfo completed={1} total={5} current={2} part="Part 1" status="Sẵn sàng" />);
  expect(html).toContain('aria-valuenow="20"');
  expect(html).toContain("1/5 câu đã gửi");
  expect(html).toContain("Câu 2 / 5");
});
