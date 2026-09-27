import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseAdminClient } = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../../lib/supabase/server", () => ({ getSupabaseAdminClient }));

import {
  createPronunciationSession,
  createWeakPronunciationSession,
  claimPronunciationAttemptProcessing,
  failPronunciationAttempt,
  findPronunciationAttemptByIdempotency,
  getClientPronunciationSession,
  listPronunciationTopicAvailability,
  retryPronunciationAttempt,
  startPronunciationAttemptProcessing,
} from "./repository";

const completedResult = {
  schemaVersion: 1,
  referenceText: "hello",
  scoredText: "hello",
  languageCode: "en",
  overall: { speakingRate: 2, accuracy: 92, completeness: 100 },
  words: [{
    text: "hello",
    accuracy: 92,
    completeness: 100,
    startMs: 0,
    endMs: 400,
    charStart: 0,
    charEnd: 5,
    syllables: [],
  }],
} as const;

function terminal<T>(data: T) {
  return { data, error: null };
}

describe("listPronunciationTopicAvailability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts only active vocabulary items with nonblank IPA", async () => {
    const not = vi.fn().mockResolvedValue(terminal([
      itemRow("one", "/wʌn/", "BEGINNER"),
      itemRow("two", "   ", "BEGINNER"),
      itemRow("three", "/θriː/", "INTERMEDIATE"),
    ]));
    const eqModeActive = vi.fn(() => ({ not }));
    const eqModeCode = vi.fn(() => ({ eq: eqModeActive }));
    const eqTopicActive = vi.fn(() => ({ eq: eqModeCode }));
    const eqStatus = vi.fn(() => ({ eq: eqTopicActive }));
    const select = vi.fn(() => ({ eq: eqStatus }));
    getSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(listPronunciationTopicAvailability()).resolves.toEqual([{
      id: "topic-1",
      slug: "travel",
      name: "Travel",
      levels: [
        { level: "BEGINNER", count: 1 },
        { level: "INTERMEDIATE", count: 1 },
      ],
      totalCount: 2,
    }]);
    expect(not).toHaveBeenCalledWith("pronunciation_ipa", "is", null);
  });
});

describe("createPronunciationSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("selects unique IPA-ready items and delegates atomic creation to the RPC", async () => {
    const candidates = [
      { id: "item-1", word: "one", pronunciation_ipa: "/wʌn/" },
      { id: "item-2", word: "two", pronunciation_ipa: "/tuː/" },
      { id: "item-3", word: "three", pronunciation_ipa: "/θriː/" },
    ];
    const db = candidateAndRpcDb(candidates, [rpcRow("item-1", 1), rpcRow("item-2", 2)]);
    getSupabaseAdminClient.mockReturnValue(db);

    const session = await createPronunciationSession("user-1", "topic-1", "BEGINNER", 2, () => 0);

    expect(db.rpc).toHaveBeenCalledWith("create_pronunciation_session", {
      p_user_id: "user-1",
      p_topic_id: "topic-1",
      p_level: "BEGINNER",
      p_item_ids: ["item-2", "item-3"],
      p_source_session_id: null,
    });
    expect(new Set(session.items.map((item) => item.vocabularyItemId)).size).toBe(2);
  });

  it("defaults a standard session to ten items", async () => {
    const candidates = Array.from({ length: 10 }, (_, index) => ({
      id: `item-${index + 1}`,
      word: `word-${index + 1}`,
      pronunciation_ipa: "/ipa/",
    }));
    const db = candidateAndRpcDb(candidates, candidates.map((item, index) => rpcRow(item.id, index + 1)));
    getSupabaseAdminClient.mockReturnValue(db);

    await createPronunciationSession("user-1", "topic-1", "BEGINNER");

    expect(db.rpc.mock.calls[0]?.[1].p_item_ids).toHaveLength(10);
  });
});

describe("getClientPronunciationSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the latest completed attempt and never lets a later failure replace it", async () => {
    getSupabaseAdminClient.mockReturnValue(sessionReadDb([
      attemptRow("success-new", "item-row-1", "COMPLETED", "2026-09-27T02:00:00Z", completedResult),
      attemptRow("failed-later", "item-row-1", "FAILED", "2026-09-27T03:00:00Z", null),
      attemptRow("success-old", "item-row-1", "COMPLETED", "2026-09-27T01:00:00Z", {
        ...completedResult,
        overall: { ...completedResult.overall, accuracy: 71 },
      }),
    ]));

    const session = await getClientPronunciationSession("session-1", "user-1");

    expect(session?.items[0]?.latestSuccessfulAttempt?.attemptId).toBe("success-new");
    expect(session?.summary).toMatchObject({ averageScore: 92, completedCount: 1, goodCount: 1 });
  });
});

describe("createWeakPronunciationSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("links a new session to its owned source and includes only weak vocabulary items", async () => {
    const weak = {
      ...completedResult,
      overall: { ...completedResult.overall, accuracy: 79 },
    };
    const db = sessionReadDb([
      attemptRow("weak-attempt", "item-row-1", "COMPLETED", "2026-09-27T02:00:00Z", weak),
      attemptRow("good-attempt", "item-row-2", "COMPLETED", "2026-09-27T02:00:00Z", completedResult),
    ], [sessionItem("item-row-1", "vocab-1", "hello", 1), sessionItem("item-row-2", "vocab-2", "world", 2)]);
    db.rpc = vi.fn().mockResolvedValue(terminal([rpcRow("vocab-1", 1, "retry-session")]));
    getSupabaseAdminClient.mockReturnValue(db);

    const retry = await createWeakPronunciationSession("user-1", "session-1");

    expect(db.rpc).toHaveBeenCalledWith("create_pronunciation_session", {
      p_user_id: "user-1",
      p_topic_id: "topic-1",
      p_level: "BEGINNER",
      p_item_ids: ["vocab-1"],
      p_source_session_id: "session-1",
    });
    expect(retry.sourceSessionId).toBe("session-1");
  });
});

describe("failPronunciationAttempt", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns authoritative state when a concurrent completion wins the guarded update", async () => {
    let readCount = 0;
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockImplementation(async () => terminal(
                processingAttemptRow(readCount++ === 0 ? "PROCESSING" : "COMPLETED"),
              )),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue(terminal([])),
          })),
        })),
      })),
    };
    getSupabaseAdminClient.mockReturnValue(db);

    await expect(failPronunciationAttempt("attempt-1", "user-1", "PROVIDER_ERROR", "Try again."))
      .resolves.toMatchObject({ status: "COMPLETED" });
  });
});

describe("startPronunciationAttemptProcessing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("moves an owned uploaded attempt into processing and returns the stored state", async () => {
    let readCount = 0;
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockImplementation(async () => terminal(
                processingAttemptRow(readCount++ === 0 ? "UPLOADED" : "PROCESSING"),
              )),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue(terminal([])),
          })),
        })),
      })),
    };
    getSupabaseAdminClient.mockReturnValue(db);

    await expect(startPronunciationAttemptProcessing("attempt-1", "user-1"))
      .resolves.toMatchObject({ status: "PROCESSING" });
  });
});

describe("claimPronunciationAttemptProcessing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when another request wins the uploaded-to-processing transition", async () => {
    const row = processingAttemptRow("UPLOADED");
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue(terminal(row)) })) })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue(terminal(null)) })),
            })),
          })),
        })),
      })),
    };
    getSupabaseAdminClient.mockReturnValue(db);

    await expect(claimPronunciationAttemptProcessing("attempt-1", "user-1"))
      .resolves.toBeNull();
  });
});

describe("attempt idempotency and retries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads an existing attempt only through its owned session item", async () => {
    const maybeSingle = vi.fn().mockResolvedValue(terminal(processingAttemptRow("COMPLETED")));
    const eqOwner = vi.fn(() => ({ maybeSingle }));
    const eqKey = vi.fn(() => ({ eq: eqOwner }));
    const eqItem = vi.fn(() => ({ eq: eqKey }));
    const select = vi.fn(() => ({ eq: eqItem }));
    getSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => ({ select })) });

    await expect(findPronunciationAttemptByIdempotency(
      "item-row-1",
      "11111111-1111-4111-8111-111111111111",
      "user-1",
    )).resolves.toMatchObject({ attemptId: "attempt-1", sessionId: "session-1" });
    expect(eqOwner).toHaveBeenCalledWith(
      "pronunciation_session_items.pronunciation_sessions.user_id",
      "user-1",
    );
  });

  it("reclaims a stale processing attempt without creating a new attempt", async () => {
    let readCount = 0;
    const maybeSingle = vi.fn().mockImplementation(async () => terminal(
      readCount++ === 0
        ? processingAttemptRow("PROCESSING", "2026-09-27T00:00:00.000Z")
        : processingAttemptRow("PROCESSING", "2026-09-27T01:00:00.000Z"),
    ));
    const updateMaybeSingle = vi.fn().mockResolvedValue(terminal({ id: "attempt-1" }));
    const db = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              lte: vi.fn(() => ({ select: vi.fn(() => ({ maybeSingle: updateMaybeSingle })) })),
            })),
          })),
        })),
      })),
    };
    getSupabaseAdminClient.mockReturnValue(db);

    await expect(retryPronunciationAttempt(
      "attempt-1",
      "user-1",
      new Date("2026-09-27T01:00:00.000Z"),
    )).resolves.toMatchObject({ attemptId: "attempt-1", status: "PROCESSING" });
    expect(updateMaybeSingle).toHaveBeenCalledOnce();
  });

  it("rejects a fresh processing attempt without updating it", async () => {
    getSupabaseAdminClient.mockReturnValue(readOnlyProcessingDb(
      processingAttemptRow("PROCESSING", "2026-09-27T00:59:00.000Z"),
    ));

    await expect(retryPronunciationAttempt(
      "attempt-1",
      "user-1",
      new Date("2026-09-27T01:00:00.000Z"),
    )).rejects.toThrow("not retryable");
  });
});

function itemRow(id: string, ipa: string, level: string) {
  return {
    id,
    level,
    pronunciation_ipa: ipa,
    topics: {
      id: "topic-1",
      slug: "travel",
      name: "Travel",
      is_active: true,
      practice_modes: { code: "GENERAL", is_active: true },
    },
  };
}

function rpcRow(vocabularyItemId: string, sequenceNo: number, sessionId = "session-new") {
  return {
    session_id: sessionId,
    session_item_id: `row-${sequenceNo}`,
    vocabulary_item_id: vocabularyItemId,
    sequence_no: sequenceNo,
    item_snapshot: {
      word: vocabularyItemId,
      pronunciation_ipa: "/ipa/",
      meaning_vi: "nghĩa",
      level: "BEGINNER",
    },
  };
}

function candidateAndRpcDb(candidates: unknown[], rpcRows: unknown[]) {
  const not = vi.fn().mockResolvedValue(terminal(candidates));
  const eqStatus = vi.fn(() => ({ not }));
  const eqLevel = vi.fn(() => ({ eq: eqStatus }));
  const eqTopic = vi.fn(() => ({ eq: eqLevel }));
  return {
    from: vi.fn((table: string) => table === "topics"
      ? ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue(terminal({ id: "topic-1", slug: "travel", name: "Travel" })),
            })),
          })),
        })
      : ({ select: vi.fn(() => ({ eq: eqTopic })) })),
    rpc: vi.fn().mockResolvedValue(terminal(rpcRows)),
  };
}

function sessionReadDb(attempts: unknown[], items = [sessionItem("item-row-1", "vocab-1", "hello", 1)]) {
  const from = vi.fn((table: string) => {
    if (table === "pronunciation_sessions") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue(terminal({
                id: "session-1",
                user_id: "user-1",
                topic_id: "topic-1",
                level: "BEGINNER",
                item_count: items.length,
                status: "COMPLETED",
                source_session_id: null,
                topics: { id: "topic-1", slug: "travel", name: "Travel" },
              })),
            })),
          })),
        })),
      };
    }
    if (table === "pronunciation_session_items") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue(terminal(items)) })),
        })),
      };
    }
    return {
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn((column: string) => column === "completed_at"
              ? ({ order: vi.fn().mockResolvedValue(terminal(attempts)) })
              : terminal(attempts)),
          })),
        })),
      })),
    };
  });
  return { from, rpc: vi.fn() };
}

function sessionItem(id: string, vocabularyItemId: string, word: string, sequenceNo: number) {
  return {
    id,
    vocabulary_item_id: vocabularyItemId,
    sequence_no: sequenceNo,
    snapshot: {
      word,
      pronunciation_ipa: "/ipa/",
      meaning_vi: "nghĩa",
      level: "BEGINNER",
    },
  };
}

function attemptRow(
  id: string,
  sessionItemId: string,
  status: "COMPLETED" | "FAILED",
  completedAt: string,
  normalizedResult: unknown,
) {
  return {
    id,
    session_item_id: sessionItemId,
    status,
    provider: normalizedResult ? "lingolix" : null,
    normalized_result: normalizedResult,
    completed_at: normalizedResult ? completedAt : null,
    created_at: completedAt,
  };
}

function processingAttemptRow(
  status: "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED",
  processingStartedAt = status === "UPLOADED" ? null : "2026-09-27T00:00:00.000Z",
) {
  return {
    id: "attempt-1",
    status,
    storage_bucket: "speaking-answers",
    storage_path: "pronunciation/attempt-1.webm",
    mime_type: "audio/webm",
    size_bytes: 123,
    duration_ms: 500,
    processing_started_at: processingStartedAt,
    session_item_id: "item-row-1",
    pronunciation_session_items: {
      id: "item-row-1",
      session_id: "session-1",
      snapshot: {
        word: "hello",
        pronunciation_ipa: "/ipa/",
        meaning_vi: "xin chào",
        level: "BEGINNER",
      },
      pronunciation_sessions: { user_id: "user-1" },
    },
  };
}

function readOnlyProcessingDb(row: unknown) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue(terminal(row)) })),
        })),
      })),
    })),
  };
}
