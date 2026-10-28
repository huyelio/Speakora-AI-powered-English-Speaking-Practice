import type { ConversationAssessment } from "./assessment";
import { additionalScenarios } from "./scenarios";

export type GoalId = string;
export type ConversationScenario = {
  key: string;
  title: string;
  description: string;
  category: "Travel" | "Everyday" | "Work" | "Social";
  difficulty: "BEGINNER" | "INTERMEDIATE";
  duration: string;
  /** Short Vietnamese speaker label. Display only; snapshots saved before it existed omit it. */
  aiName?: string;
  aiRole: string;
  learnerRole: string;
  context: string;
  opening: string;
  instructions: string;
  goals: { id: GoalId; label: string; hint: string; criterion: string }[];
};

export const airplaneScenario: ConversationScenario = {
  key: "airplane-chat-v1",
  title: "An airplane chat",
  category: "Travel",
  difficulty: "BEGINNER",
  context: "Two passengers have been on a long flight for a few hours and begin a relaxed conversation.",
  instructions: "Be a friendly fellow passenger. Follow the learner's travel interests without assuming their destination.",
  duration: "3–7 phút",
  description: "You are on a long flight, sitting next to a friendly passenger. You've been flying for a few hours before they start a conversation. Share your travel plans, including where you're going, why you're going there, and what you're looking forward to doing.",
  aiName: "Hành khách bên cạnh",
  aiRole: "A friendly passenger sitting next to the learner.",
  learnerRole: "A passenger travelling somewhere.",
  opening: "It's a long flight, isn't it? Are you travelling for business or pleasure?",
  goals: [
    { id: "destination_reason", label: "Nói nơi bạn đến và lý do chuyến đi", hint: "I'm going to ___ because ___.", criterion: "The learner states both a destination and a reason for travelling." },
    { id: "looking_forward", label: "Chia sẻ một hoạt động bạn mong đợi", hint: "I'm looking forward to ___.", criterion: "The learner shares an activity or thing they look forward to doing." },
  ],
} as const;

export const conversationScenarios: readonly ConversationScenario[] = [airplaneScenario, ...additionalScenarios];

export function findConversationScenario(key: string) {
  return conversationScenarios.find(scenario => scenario.key === key);
}

/** Speaker label for the AI; older snapshots fall back to the catalog entry with the same key. */
export function scenarioAiName(scenario: ConversationScenario) {
  return scenario.aiName ?? findConversationScenario(scenario.key)?.aiName ?? "Bạn trò chuyện";
}

export const scenarioCategoryLabels: Record<ConversationScenario["category"], string> = {
  Travel: "Du lịch", Everyday: "Đời sống", Work: "Công việc", Social: "Giao tiếp",
};

/** Sessions keep their saved content. Only legacy airplane fields receive defaults. */
export function parseScenarioSnapshot(value: unknown): ConversationScenario {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid scenario snapshot.");
  const saved = value as Record<string, unknown>;
  const legacy = saved.key === airplaneScenario.key ? airplaneScenario : undefined;
  const merged = { ...legacy, ...saved } as Record<string, unknown>;
  for (const field of ["key", "title", "description", "duration", "aiRole", "learnerRole", "context", "opening", "instructions"]) {
    if (typeof merged[field] !== "string" || !(merged[field] as string).trim()) throw new Error("Invalid scenario snapshot.");
  }
  if (!["Travel", "Everyday", "Work", "Social"].includes(String(merged.category))
    || !["BEGINNER", "INTERMEDIATE"].includes(String(merged.difficulty))
    || !Array.isArray(saved.goals) || !saved.goals.length) throw new Error("Invalid scenario snapshot.");
  const goals = saved.goals.map((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new Error("Invalid scenario goal.");
    const goal = raw as Record<string, unknown>;
    const defaults = legacy?.goals.find(item => item.id === goal.id);
    const parsed: Record<string, unknown> = { ...defaults, ...goal };
    if (["id", "label", "hint", "criterion"].some(field => typeof parsed[field] !== "string" || !(parsed[field] as string).trim())) throw new Error("Invalid scenario goal.");
    return parsed as ConversationScenario["goals"][number];
  });
  if (new Set(goals.map(goal => goal.id)).size !== goals.length) throw new Error("Duplicate scenario goals.");
  return { ...merged, goals } as ConversationScenario;
}

export type ConversationReply = { reply: string; completedGoals: GoalId[] };
export function parseConversationReply(value: unknown, scenario: ConversationScenario = airplaneScenario): ConversationReply {
  if (!value || typeof value !== "object") throw new Error("Invalid conversation response.");
  const item = value as Record<string, unknown>;
  if (typeof item.reply !== "string" || !item.reply.trim() || item.reply.length > 1000
    || !Array.isArray(item.completedGoals) || item.completedGoals.length > scenario.goals.length
    || !item.completedGoals.every((goal) => typeof goal === "string" && scenario.goals.some(item => item.id === goal))) {
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
  scenario: ConversationScenario;
  /** Saved once the ended session is assessed; null before that or when it was too short. */
  assessment: ConversationAssessment | null;
  /** XP granted with the assessment (role-play plus any daily goal it completed). */
  reward_xp: number;
  id: string; status: "IN_PROGRESS" | "COMPLETED"; user_turn_count: number;
  completed_goals: GoalId[]; pending_message_id: string | null;
  processing_until: string | null; messages: ConversationMessage[];
};
