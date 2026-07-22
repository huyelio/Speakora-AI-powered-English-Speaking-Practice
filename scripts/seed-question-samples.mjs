import { createClient } from "@supabase/supabase-js";

const url = process.env.PROJECT_URL?.trim();
const secretKey = process.env.SECRET_KEY?.trim();

if (!url || !secretKey) {
  throw new Error("PROJECT_URL and SECRET_KEY are required in .env.");
}

const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const modes = [
  { code: "IELTS", name: "IELTS Speaking", description: "Practice for IELTS Speaking Parts 1–3.", is_active: true },
  { code: "TOEIC", name: "TOEIC Speaking", description: "Workplace-focused speaking practice.", is_active: true },
  { code: "GENERAL", name: "General English", description: "Everyday English speaking practice.", is_active: true },
];

const typeDefinitions = [
  ["IELTS", "IELTS_PART_1", "IELTS Part 1", 0, 30, 2],
  ["IELTS", "IELTS_PART_2_CUE_CARD", "IELTS Part 2 Cue Card", 60, 120, 2],
  ["IELTS", "IELTS_PART_3", "IELTS Part 3", 0, 60, 2],
  ["TOEIC", "TOEIC_RESPOND_QUESTIONS", "Respond to Questions", 3, 30, 2],
  ["TOEIC", "TOEIC_EXPRESS_OPINION", "Express an Opinion", 45, 60, 2],
  ["GENERAL", "GENERAL_OPEN_TOPIC", "Open Topic", 15, 60, 3],
  ["GENERAL", "GENERAL_SITUATIONAL", "Situational Response", 15, 60, 3],
  ["GENERAL", "GENERAL_ROLE_PLAY", "Role-play", 15, 60, 3],
];

const topicDefinitions = [
  ["IELTS", "daily-life", "Daily Life"],
  ["IELTS", "learning", "Learning"],
  ["TOEIC", "workplace", "Workplace"],
  ["TOEIC", "customer-service", "Customer Service"],
  ["GENERAL", "travel", "Travel"],
  ["GENERAL", "community", "Community"],
];

const groupDefinitions = [
  ["IELTS", "daily-life", "SAMPLE_IELTS_DAILY_ROUTINE", "TOPIC_SET", "Daily routines", null, "INTERMEDIATE"],
  ["IELTS", "learning", "SAMPLE_IELTS_SKILL_CUE_CARD", "CUE_CARD_SET", "Learning a new skill", null, "INTERMEDIATE"],
  ["TOEIC", "customer-service", "SAMPLE_TOEIC_CUSTOMER_CALL", "SCENARIO", "Customer service call", "A customer is calling a store about a recent purchase.", "INTERMEDIATE"],
  ["GENERAL", "travel", "SAMPLE_GENERAL_HOTEL", "SCENARIO", "Hotel reservation", "You are calling a hotel to change a reservation.", "INTERMEDIATE"],
];

const questionDefinitions = [
  {
    mode: "IELTS", type: "IELTS_PART_1", topic: "daily-life", group: "SAMPLE_IELTS_DAILY_ROUTINE",
    code: "SAMPLE_IELTS_P1_001", sequence: 1,
    prompt: "What part of your daily routine do you enjoy the most?",
    instruction: "Give a natural answer and include a reason.", difficulty: "INTERMEDIATE",
  },
  {
    mode: "IELTS", type: "IELTS_PART_2_CUE_CARD", topic: "learning", group: "SAMPLE_IELTS_SKILL_CUE_CARD",
    code: "SAMPLE_IELTS_P2_001", sequence: 1,
    prompt: "Describe a practical skill you would like to learn in the future.",
    instruction: "You should say:", difficulty: "INTERMEDIATE",
    items: ["what the skill is", "why you want to learn it", "how you could learn it", "how it would be useful to you"],
  },
  {
    mode: "IELTS", type: "IELTS_PART_3", topic: "learning",
    code: "SAMPLE_IELTS_P3_001",
    prompt: "How has technology changed the way adults learn new skills?",
    instruction: "Discuss the question and support your ideas with examples.", difficulty: "ADVANCED",
  },
  {
    mode: "TOEIC", type: "TOEIC_RESPOND_QUESTIONS", topic: "customer-service", group: "SAMPLE_TOEIC_CUSTOMER_CALL",
    code: "SAMPLE_TOEIC_RESPOND_001", sequence: 1,
    prompt: "When did you purchase the item, and what problem are you having with it?",
    instruction: "Answer as the customer in the situation.", difficulty: "INTERMEDIATE",
  },
  {
    mode: "TOEIC", type: "TOEIC_EXPRESS_OPINION", topic: "workplace",
    code: "SAMPLE_TOEIC_OPINION_001",
    prompt: "Do flexible working hours make employees more productive? Give reasons and examples.",
    instruction: "State your opinion clearly and support it.", difficulty: "ADVANCED",
  },
  {
    mode: "TOEIC", type: "TOEIC_RESPOND_QUESTIONS", topic: "workplace",
    code: "SAMPLE_TOEIC_RESPOND_002",
    prompt: "What is one change that would make meetings at your workplace more effective?",
    instruction: "Answer briefly and explain your suggestion.", difficulty: "INTERMEDIATE",
  },
  {
    mode: "GENERAL", type: "GENERAL_OPEN_TOPIC", topic: "community",
    code: "SAMPLE_GENERAL_OPEN_001",
    prompt: "Describe a place in your neighborhood where people like to spend time.",
    instruction: "Describe the place and explain why people enjoy it.", difficulty: "BEGINNER",
  },
  {
    mode: "GENERAL", type: "GENERAL_SITUATIONAL", topic: "travel",
    code: "SAMPLE_GENERAL_SITUATION_001",
    prompt: "Your flight has been delayed. Ask an airline employee for information about the new departure time.",
    instruction: "Speak politely and ask at least two relevant questions.", difficulty: "INTERMEDIATE",
  },
  {
    mode: "GENERAL", type: "GENERAL_ROLE_PLAY", topic: "travel", group: "SAMPLE_GENERAL_HOTEL",
    code: "SAMPLE_GENERAL_ROLEPLAY_001", sequence: 1,
    prompt: "Explain the reservation change you need and ask whether there is an extra fee.",
    instruction: "You are the hotel guest. Respond naturally to the receptionist.", difficulty: "INTERMEDIATE",
    config: { learner_role: "hotel guest", system_role: "receptionist" },
    items: ["Explain the requested date change", "Ask about availability", "Ask about an extra fee"],
  },
];

async function upsert(table, rows, onConflict) {
  const { data, error } = await supabase.from(table).upsert(rows, { onConflict }).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

const modeRows = await upsert("practice_modes", modes, "code");
const modeByCode = new Map(modeRows.map((row) => [row.code, row]));

const typeRows = await upsert(
  "question_types",
  typeDefinitions.map(([mode, code, name, prep, answer, replay], index) => ({
    mode_id: modeByCode.get(mode).id,
    code,
    name,
    default_prep_seconds: prep,
    default_answer_seconds: answer,
    default_replay_limit: replay,
    requires_stimulus: false,
    required_asset_types: [],
    config: {},
    sort_order: index + 1,
    is_active: true,
  })),
  "mode_id,code",
);
const typeByCode = new Map(typeRows.map((row) => [`${row.mode_id}:${row.code}`, row]));

const topicRows = await upsert(
  "topics",
  topicDefinitions.map(([mode, slug, name]) => ({ mode_id: modeByCode.get(mode).id, slug, name, is_active: true })),
  "mode_id,slug",
);
const topicByKey = new Map(topicRows.map((row) => [`${row.mode_id}:${row.slug}`, row]));

const groupRows = await upsert(
  "question_groups",
  groupDefinitions.map(([mode, topic, code, groupType, title, sharedContext, difficulty]) => {
    const modeId = modeByCode.get(mode).id;
    return {
      mode_id: modeId,
      topic_id: topicByKey.get(`${modeId}:${topic}`).id,
      code,
      group_type: groupType,
      title,
      shared_context: sharedContext,
      difficulty_level: difficulty,
      status: "ACTIVE",
      metadata: { source: "ORIGINAL", sample: true },
    };
  }),
  "code",
);
const groupByCode = new Map(groupRows.map((row) => [row.code, row]));

const questionRows = await upsert(
  "questions",
  questionDefinitions.map((question) => {
    const modeId = modeByCode.get(question.mode).id;
    const type = typeByCode.get(`${modeId}:${question.type}`);
    const topic = topicByKey.get(`${modeId}:${question.topic}`);
    return {
      mode_id: modeId,
      question_type_id: type.id,
      group_id: question.group ? groupByCode.get(question.group).id : null,
      topic_id: topic.id,
      code: question.code,
      sequence_in_group: question.sequence ?? null,
      prompt_text: question.prompt,
      instruction_text: question.instruction,
      prep_seconds: null,
      answer_seconds: null,
      replay_limit: null,
      difficulty_level: question.difficulty,
      status: "ACTIVE",
      version: 1,
      config: { source: "ORIGINAL", sample: true, ...(question.config ?? {}) },
    };
  }),
  "code",
);
const questionByCode = new Map(questionRows.map((row) => [row.code, row]));

for (const question of questionDefinitions.filter((item) => item.items?.length)) {
  const questionId = questionByCode.get(question.code).id;
  const { error: deleteError } = await supabase.from("question_prompt_items").delete().eq("question_id", questionId);
  if (deleteError) throw new Error(`question_prompt_items cleanup: ${deleteError.message}`);

  const { error: insertError } = await supabase.from("question_prompt_items").insert(
    question.items.map((content, index) => ({
      question_id: questionId,
      item_type: question.type === "IELTS_PART_2_CUE_CARD" ? "BULLET" : "ROLE_GOAL",
      content,
      sequence_no: index + 1,
      is_required: true,
    })),
  );
  if (insertError) throw new Error(`question_prompt_items: ${insertError.message}`);
}

console.log(`Seed complete: ${modeRows.length} modes, ${typeRows.length} types, ${topicRows.length} topics, ${questionRows.length} questions.`);
