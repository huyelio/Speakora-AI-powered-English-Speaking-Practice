export const goalIds = ["destination_reason", "looking_forward"] as const;
export type GoalId = typeof goalIds[number];
export const airplaneScenario = {
  key: "airplane-chat-v1",
  title: "An airplane chat",
  duration: "3–7 phút",
  description: "You are on a long flight, sitting next to a friendly passenger. You've been flying for a few hours before they start a conversation. Share your travel plans, including where you're going, why you're going there, and what you're looking forward to doing.",
  aiRole: "A friendly passenger sitting next to the learner.",
  learnerRole: "A passenger travelling somewhere.",
  opening: "It's a long flight, isn't it? Are you travelling for business or pleasure?",
  goals: [
    { id: "destination_reason", label: "Nói nơi bạn đến và lý do chuyến đi", hint: "I'm going to ___ because ___." },
    { id: "looking_forward", label: "Chia sẻ một hoạt động bạn mong đợi", hint: "I'm looking forward to ___." },
  ],
} as const;

export type ConversationReply = { reply: string; completedGoals: GoalId[] };
export function parseConversationReply(value: unknown): ConversationReply {
  if (!value || typeof value !== "object") throw new Error("Invalid conversation response.");
  const item = value as Record<string, unknown>;
  if (typeof item.reply !== "string" || !item.reply.trim() || item.reply.length > 1000
    || !Array.isArray(item.completedGoals) || item.completedGoals.length > 2
    || !item.completedGoals.every((goal) => goalIds.includes(goal as GoalId))) {
    throw new Error("Invalid conversation response.");
  }
  return { reply: item.reply.trim(), completedGoals: [...new Set(item.completedGoals)] as GoalId[] };
}
export function mergeGoals(previous: GoalId[], incoming: GoalId[]): GoalId[] {
  return [...new Set([...previous, ...incoming])];
}

export type ConversationMessage = {
  id: string; role: "user" | "assistant"; content: string; turn_index: number;
  processing_status: "PENDING" | "TRANSCRIBED" | "COMPLETED";
  completed_goals: GoalId[];
};
export type ConversationSession = {
  id: string; status: "IN_PROGRESS" | "COMPLETED"; user_turn_count: number;
  completed_goals: GoalId[]; pending_message_id: string | null;
  processing_until: string | null; messages: ConversationMessage[];
};
