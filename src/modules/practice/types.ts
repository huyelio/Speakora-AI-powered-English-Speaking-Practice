export type SessionQuestion = {
  sessionQuestionId: string; sequenceNo: number; id: string; code: string;
  promptText: string; instructionText: string | null; prepSeconds: number; answerSeconds: number;
  questionType: string; topic: { slug: string; name: string } | null;
  promptItems: Array<{ content: string; sequenceNo: number }>;
};

export type PracticeMode = "IELTS" | "GENERAL";

export type IeltsAssessment = {
  estimatedBand: number; overallFeedback: string; strengths: string[];
  improvements: string[]; nextSteps: string[];
  criteria: { fluencyCoherence: CriterionFeedback; lexicalResource: CriterionFeedback; grammaticalRangeAccuracy: CriterionFeedback } | null;
};

/** Task 7 will populate and validate this mode-specific payload. */
export type GeneralAssessment = {
  overallFeedback: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  criteria: { fluencyCoherence: CriterionFeedback; lexicalResource: CriterionFeedback; grammaticalRangeAccuracy: CriterionFeedback } | null;
  usefulPhrase: string;
  recommendationTags: string[];
};

export type PracticeResult =
  | ({ mode: "IELTS" } & IeltsAssessment)
  | ({ mode: "GENERAL" } & GeneralAssessment);

// Kept for the existing IELTS demo until its result view becomes mode-aware.
export type Assessment = IeltsAssessment;

export type AuthorizedSession = {
  id: string;
  status: string;
  mode: PracticeMode;
  userId: string | null;
  guestTokenHash: string | null;
  questionCount: number;
  topicId: string | null;
  difficulty: string | null;
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
