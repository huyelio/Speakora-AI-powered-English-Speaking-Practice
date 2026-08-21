import { beforeEach, describe, expect, it, vi } from "vitest";

const { createAuthServerClient } = vi.hoisted(() => ({
  createAuthServerClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../../lib/supabase/auth-server", () => ({
  createAuthServerClient,
}));

import { getProfile } from "./repository";

describe("getProfile", () => {
  beforeEach(() => {
    const profileQuery = {
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            user_id: "learner-1",
            display_name: "Lan",
            level: "INTERMEDIATE",
            learning_purpose: "Travel",
            timezone: "Asia/Ho_Chi_Minh",
            onboarding_completed_at: "2026-08-21T00:00:00.000Z",
          },
          error: null,
        }),
      })),
    };
    const goalQuery = {
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { daily_answer_target: 10 },
          error: null,
        }),
      })),
    };

    createAuthServerClient.mockResolvedValue({
      from: vi.fn((table: string) => ({
        select: vi.fn((columns: string) => {
          if (table === "profiles" && columns.includes("learning_goals(")) {
            return {
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { code: "PGRST200" },
                }),
              })),
            };
          }

          return table === "profiles" ? profileQuery : goalQuery;
        }),
      })),
    });
  });

  it("reads a profile and its same-user goal without an unsupported embedded relationship", async () => {
    await expect(getProfile("learner-1")).resolves.toEqual({
      userId: "learner-1",
      displayName: "Lan",
      level: "INTERMEDIATE",
      learningPurpose: "Travel",
      timezone: "Asia/Ho_Chi_Minh",
      dailyAnswerTarget: 10,
      onboardingCompletedAt: "2026-08-21T00:00:00.000Z",
    });
  });
});
