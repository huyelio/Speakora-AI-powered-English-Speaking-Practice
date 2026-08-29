import { describe, expect, it, vi } from "vitest";
import {
  createJobFailureHandler,
  createJobProcessors,
  type AssessmentRecord,
  type ProcessingJob,
  type WorkerDatabase,
  type WorkerFailureDatabase,
} from "./processors";

const assessmentJob: ProcessingJob = {
  id: "job-1",
  session_id: "session-1",
  answer_id: null,
  job_type: "ASSESSMENT",
  attempt_count: 1,
  max_attempts: 3,
};

const generalOutput = {
  overall_feedback: "Bạn trình bày rõ ràng.",
  criteria: {
    fluency_coherence: { summary: "Mạch ý rõ.", example: null },
    lexical_resource: { summary: "Từ phù hợp.", example: null },
    grammatical_range_accuracy: { summary: "Câu khá chính xác.", example: null },
  },
  strengths: ["Rõ ý"],
  improvements: ["Thêm chi tiết"],
  next_steps: ["Luyện chủ đề Work"],
  useful_phrase: "One reason is that ...",
  recommendation_tags: ["WORK", "VOCABULARY"],
};

const ieltsOutput = {
  estimated_band: 6.5,
  overall_feedback: "Bạn trình bày khá rõ ràng.",
  criteria: {
    fluency_coherence: { summary: "Mạch ý rõ.", example: null },
    lexical_resource: { summary: "Từ phù hợp.", example: null },
    grammatical_range_accuracy: { summary: "Câu khá chính xác.", example: null },
  },
  strengths: ["Rõ ý"],
  improvements: ["Thêm chi tiết"],
  next_steps: ["Luyện mở rộng câu trả lời"],
};

describe("createJobProcessors", () => {
  it("persists a General assessment before rewards and succeeds last", async () => {
    const events: string[] = [];
    const db = assessmentDatabase(events);
    const output = new Proxy(generalOutput, {
      get(target, property, receiver) {
        if (property === "estimated_band") throw new Error("General assessment read estimated_band");
        return Reflect.get(target, property, receiver);
      },
    });
    const provider = {
      transcribe: vi.fn(),
      assess: vi.fn(async (_input: string, mode: "IELTS" | "GENERAL") => {
        events.push(`assess:${mode}`);
        return output;
      }),
    };

    await createJobProcessors({ db, provider, now: () => new Date("2026-08-21T12:00:00Z") }).runAssessment(assessmentJob);

    expect(provider.assess).toHaveBeenCalledWith(expect.stringContaining("Answer: I work in a small team"), "GENERAL");
    expect(db.saveAssessment).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: "session-1",
      assessmentMode: "GENERAL",
      estimatedBand: null,
      rawOutput: generalOutput,
    }));
    expect(events).toEqual(["assess:GENERAL", "save", "complete", "reward", "succeed"]);
  });

  it("does not complete, reward, or succeed when assessment persistence fails", async () => {
    const events: string[] = [];
    const db = assessmentDatabase(events);
    db.saveAssessment = vi.fn(async () => {
      events.push("save");
      throw new Error("assessment write failed");
    });
    const provider = { transcribe: vi.fn(), assess: vi.fn().mockResolvedValue(generalOutput) };

    await expect(createJobProcessors({ db, provider }).runAssessment(assessmentJob)).rejects.toThrow("assessment write failed");

    expect(events).toEqual(["save"]);
  });

  it("preserves the IELTS assessment contract and estimated band", async () => {
    const db = assessmentDatabase([]);
    db.getSessionMode = vi.fn().mockResolvedValue("IELTS");
    const provider = { transcribe: vi.fn(), assess: vi.fn().mockResolvedValue(ieltsOutput) };

    await createJobProcessors({ db, provider }).runAssessment(assessmentJob);

    expect(provider.assess).toHaveBeenCalledWith(expect.any(String), "IELTS");
    expect(db.saveAssessment).toHaveBeenCalledWith(expect.objectContaining({
      assessmentMode: "IELTS",
      estimatedBand: 6.5,
      promptVersion: "ielts-session-v3",
      rawOutput: ieltsOutput,
    }));
  });

  it("upserts one assessment and relies on idempotent zero-XP rewards on retry", async () => {
    const rows = new Map<string, AssessmentRecord>();
    const rewardResults = [45, 0];
    const db = assessmentDatabase([]);
    db.saveAssessment = vi.fn(async (record) => { rows.set(record.sessionId, record); });
    db.completeSessionRewards = vi.fn(async () => ({ awardedXp: rewardResults.shift() ?? 0 }));
    const provider = { transcribe: vi.fn(), assess: vi.fn().mockResolvedValue(generalOutput) };
    const processors = createJobProcessors({ db, provider });

    await processors.runAssessment(assessmentJob);
    await processors.runAssessment({ ...assessmentJob, id: "job-retry", attempt_count: 2 });

    expect(rows.size).toBe(1);
    expect(db.completeSessionRewards).toHaveNthReturnedWith(2, Promise.resolve({ awardedXp: 0 }));
  });

  it("recovers a terminal final-status write after publishing rewards without regressing the session", async () => {
    let assessmentSaved = false;
    let sessionStatus = "PROCESSING";
    let jobStatus = "RUNNING";
    let rewardCalls = 0;
    let succeedCalls = 0;
    const db = assessmentDatabase([]);
    db.saveAssessment = vi.fn(async () => { assessmentSaved = true; });
    db.markSessionCompleted = vi.fn(async () => { sessionStatus = "COMPLETED"; });
    db.completeSessionRewards = vi.fn(async () => {
      rewardCalls += 1;
      return { awardedXp: rewardCalls === 1 ? 45 : 0 };
    });
    db.markJobSucceeded = vi.fn(async () => {
      succeedCalls += 1;
      if (succeedCalls === 1) throw new Error("job status write failed");
      jobStatus = "SUCCEEDED";
    });
    const failureDb = failureDatabase({
      markJobSucceeded: db.markJobSucceeded,
      onJobFailure: (status) => { jobStatus = status; },
      onSessionFailed: () => { sessionStatus = "FAILED"; },
    });
    const provider = { transcribe: vi.fn(), assess: vi.fn().mockResolvedValue(generalOutput) };
    const terminalJob = { ...assessmentJob, attempt_count: 3 };

    let processingError: unknown;
    try {
      await createJobProcessors({ db, provider }).runAssessment(terminalJob);
    } catch (error) {
      processingError = error;
    }
    await createJobFailureHandler({ db: failureDb })(terminalJob, processingError);

    expect({ assessmentSaved, sessionStatus, jobStatus, rewardCalls }).toEqual({
      assessmentSaved: true,
      sessionStatus: "COMPLETED",
      jobStatus: "SUCCEEDED",
      rewardCalls: 1,
    });
    expect(failureDb.markJobFailure).not.toHaveBeenCalled();
    expect(failureDb.markSessionFailed).not.toHaveBeenCalled();
  });

  it("retains terminal failure handling for errors before assessment publication", async () => {
    const failureDb = failureDatabase();
    const terminalJob = { ...assessmentJob, attempt_count: 3 };

    await createJobFailureHandler({ db: failureDb })(terminalJob, new Error("provider failed"));

    expect(failureDb.markJobFailure).toHaveBeenCalledWith(expect.objectContaining({
      jobId: "job-1",
      status: "FAILED",
      errorMessage: "provider failed",
    }));
    expect(failureDb.markSessionFailed).toHaveBeenCalledWith("session-1");
  });

  it("finishes STT persistence and assessment enqueue before succeeding the job", async () => {
    const events: string[] = [];
    const db = assessmentDatabase(events);
    db.getAnswer = vi.fn().mockResolvedValue({
      id: "answer-1",
      storageBucket: "speaking-answers",
      storagePath: "sessions/session-1/answers/answer-1.webm",
      mimeType: "audio/webm",
    });
    db.markAnswerTranscribing = vi.fn(async () => { events.push("transcribing"); });
    db.downloadAudio = vi.fn(async () => new Blob(["audio"]));
    db.saveTranscript = vi.fn(async () => { events.push("transcript"); });
    db.markAnswerTranscribed = vi.fn(async () => { events.push("transcribed"); });
    db.countTranscribedAnswers = vi.fn().mockResolvedValue(5);
    db.enqueueAssessment = vi.fn(async () => { events.push("enqueue"); });
    db.markSessionProcessing = vi.fn(async () => { events.push("processing"); });
    const provider = { transcribe: vi.fn().mockResolvedValue("I work in a small team"), assess: vi.fn() };

    await createJobProcessors({ db, provider }).runStt({
      ...assessmentJob,
      id: "stt-job",
      answer_id: "answer-1",
      job_type: "STT",
    });

    expect(provider.transcribe).toHaveBeenCalledWith(expect.any(Blob), "answer-1.webm");
    expect(events).toEqual(["transcribing", "transcript", "transcribed", "enqueue", "processing", "succeed"]);
  });
});

function assessmentDatabase(events: string[]): WorkerDatabase & {
  saveAssessment: ReturnType<typeof vi.fn>;
  completeSessionRewards: ReturnType<typeof vi.fn>;
} {
  return {
    getAnswer: vi.fn(),
    markAnswerTranscribing: vi.fn(),
    downloadAudio: vi.fn(),
    saveTranscript: vi.fn(),
    markAnswerTranscribed: vi.fn(),
    countTranscribedAnswers: vi.fn(),
    enqueueAssessment: vi.fn(),
    markSessionProcessing: vi.fn(),
    markJobSucceeded: vi.fn(async () => { events.push("succeed"); }),
    getSessionMode: vi.fn().mockResolvedValue("GENERAL"),
    getTranscriptPairs: vi.fn().mockResolvedValue([
      { sequence: 1, question: "Describe your work.", transcript: "I work in a small team" },
      { sequence: 2, question: "What do you enjoy?", transcript: "I enjoy helping customers" },
      { sequence: 3, question: "What is difficult?", transcript: "Busy days are difficult" },
      { sequence: 4, question: "How do you learn?", transcript: "I ask my manager" },
      { sequence: 5, question: "What is next?", transcript: "I want a new role" },
    ]),
    saveAssessment: vi.fn(async () => { events.push("save"); }),
    markSessionCompleted: vi.fn(async () => { events.push("complete"); }),
    completeSessionRewards: vi.fn(async () => { events.push("reward"); return { awardedXp: 45 }; }),
  };
}

function failureDatabase(options: {
  markJobSucceeded?: WorkerFailureDatabase["markJobSucceeded"];
  onJobFailure?: (status: "QUEUED" | "FAILED") => void;
  onSessionFailed?: () => void;
} = {}): WorkerFailureDatabase & {
  markJobFailure: ReturnType<typeof vi.fn>;
  markSessionFailed: ReturnType<typeof vi.fn>;
} {
  return {
    markJobSucceeded: options.markJobSucceeded ?? vi.fn(),
    markJobFailure: vi.fn(async (input) => { options.onJobFailure?.(input.status); }),
    markAnswerFailed: vi.fn(),
    markSessionFailed: vi.fn(async () => { options.onSessionFailed?.(); }),
  };
}
