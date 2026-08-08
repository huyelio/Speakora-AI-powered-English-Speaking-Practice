export type ReviewAnswer = {
  sessionQuestionId: string; answerId: string; sequenceNo: number; questionType: string;
  promptText: string; transcript: string; audioUrl: string;
};

export function mapReviewRows(sessionId: string, rows: any[]): ReviewAnswer[] {
  return [...rows].sort((a, b) => a.sequence_no - b.sequence_no).map((row) => {
    const answer = Array.isArray(row.user_answers) ? row.user_answers[0] : row.user_answers;
    const transcript = Array.isArray(answer.transcripts) ? answer.transcripts[0] : answer.transcripts;
    return {
      sessionQuestionId: row.id,
      answerId: answer.id,
      sequenceNo: row.sequence_no,
      questionType: row.prompt_snapshot.question_type,
      promptText: row.prompt_snapshot.prompt_text,
      transcript: transcript.text,
      audioUrl: `/api/practice/sessions/${sessionId}/answers/${answer.id}/audio`,
    };
  });
}
