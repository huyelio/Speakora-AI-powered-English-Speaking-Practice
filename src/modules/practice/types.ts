export type SessionQuestion = {
  sessionQuestionId: string; sequenceNo: number; id: string; code: string;
  promptText: string; instructionText: string | null; prepSeconds: number; answerSeconds: number;
  questionType: string; topic: { slug: string; name: string } | null;
  promptItems: Array<{ content: string; sequenceNo: number }>;
};

export type Assessment = {
  estimatedBand: number; overallFeedback: string; strengths: string[];
  improvements: string[]; nextSteps: string[];
  criteria: { fluencyCoherence: CriterionFeedback; lexicalResource: CriterionFeedback; grammaticalRangeAccuracy: CriterionFeedback } | null;
};

export type CriterionFeedback = { summary: string; example: { original: string; corrected: string | null } | null };

export type AnswerReview = {
  sessionQuestionId: string; answerId: string; sequenceNo: number; questionType: string;
  promptText: string; transcript: string; audioUrl: string;
};

export type SessionStatus = {
  sessionId: string; status: string; completed: number; failed: number; total: number;
  assessmentStatus: "WAITING" | "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  answers: Array<{ sessionQuestionId: string; sequenceNo: number; status: string }>;
};
