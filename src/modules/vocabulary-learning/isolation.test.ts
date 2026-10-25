import { describe, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../../lib/supabase/server", () => ({ getSupabaseAdminClient: client }));
import { saveVocabularyReview } from "../vocabulary/repository";
import { getLearningSession } from "./repository";

describe("mode isolation", () => {
  it("refuses the legacy review write for a V2 session", async () => {
    const session = { id: "s", session_kind: "LEARNING_V2", topics: { id: "t", name: "Travel", slug: "travel" }, level: "BEGINNER", item_count: 1, status: "IN_PROGRESS" };
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: session }), order: vi.fn().mockResolvedValue({ data: [] }), upsert: vi.fn() };
    client.mockReturnValue({ from: vi.fn(() => query) });
    await expect(saveVocabularyReview("s", "u", "i", "REMEMBERED")).rejects.toThrow("VOCABULARY_LEARNING_SESSION");
    expect(query.upsert).not.toHaveBeenCalled();
  });
  it("scopes V2 reads to owner and discriminator before loading any items", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) };
    const from = vi.fn(() => query);
    client.mockReturnValue({ from });
    expect(await getLearningSession("s", "u")).toBeNull();
    expect(query.eq.mock.calls).toEqual([["id", "s"], ["user_id", "u"], ["session_kind", "LEARNING_V2"]]);
    expect(from).toHaveBeenCalledTimes(1);
  });
});
