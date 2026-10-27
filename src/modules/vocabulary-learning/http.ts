import "server-only";
import { NextResponse } from "next/server";
import { resolveSessionPrincipal } from "../practice/auth";
import { isLearnerLevel } from "../vocabulary/selection";
import { LearningError } from "./errors";

export function uuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LearningError("INVALID_INPUT", "Thông tin chưa hợp lệ.");
  return value as Record<string, unknown>;
}
export function readCreateInput(value: unknown) {
  const b = record(value);
  if (!uuid(b.topicId) || !uuid(b.requestId) || !isLearnerLevel(b.level)
    || (b.sourceSessionId !== undefined && !uuid(b.sourceSessionId))
    || (b.selection !== undefined && b.selection !== "MASTERED")
    || (b.sourceSessionId !== undefined && b.selection !== undefined)) throw new LearningError("INVALID_INPUT", "Chủ đề, trình độ hoặc lựa chọn chưa hợp lệ.");
  return { topicId: b.topicId.toLowerCase(), requestId: b.requestId.toLowerCase(), level: b.level,
    sourceSessionId: typeof b.sourceSessionId === "string" ? b.sourceSessionId.toLowerCase() : undefined, masteredOnly: b.selection === "MASTERED" };
}
export function readMutationInput(value: unknown, action: "advance" | "answer") {
  const b = record(value);
  if (!uuid(b.sessionItemId) || !(action === "advance" ? ["LEARN", "PRONOUNCE"] : ["RECALL", "CONTEXT"]).includes(String(b.stage))
    || (action === "answer" && (typeof b.answer !== "string" || b.answer.length > 200))
    // Only a Pronounce advance may skip; the RPC reads it as p_answer='SKIP'.
    || (b.skip !== undefined && (action !== "advance" || b.skip !== true || b.stage !== "PRONOUNCE"))) throw new LearningError("INVALID_INPUT", "Câu trả lời hoặc bước học chưa hợp lệ.");
  const answer = action === "answer" ? (b.answer as string).trim().toLowerCase() : b.skip === true ? "SKIP" : null;
  return { sessionItemId: b.sessionItemId, stage: String(b.stage), answer };
}
export async function learningRequest(request: Request, work: (userId: string) => Promise<unknown>, status = 200) {
  try {
    const principal = await resolveSessionPrincipal(request);
    if (!principal || principal.kind !== "user") throw new LearningError("UNAUTHORIZED", "Bạn cần đăng nhập để tiếp tục.", 401);
    return NextResponse.json(await work(principal.userId), { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof LearningError;
    return NextResponse.json({ error: known ? error.message : "Không thể xử lý yêu cầu. Hãy thử lại.", code: known ? error.code : "INTERNAL_ERROR" },
      { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
