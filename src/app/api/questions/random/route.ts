import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES = new Set(["IELTS", "TOEIC", "GENERAL"]);
const DIFFICULTIES = new Set(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,49}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode")?.toUpperCase();
  const type = request.nextUrl.searchParams.get("type")?.toUpperCase();
  const difficulty = request.nextUrl.searchParams.get("difficulty")?.toUpperCase();
  const topic = request.nextUrl.searchParams.get("topic")?.toLowerCase();

  if (!mode || !MODES.has(mode)) return badRequest("mode must be IELTS, TOEIC, or GENERAL.");
  if (type && !CODE_PATTERN.test(type)) return badRequest("type is invalid.");
  if (difficulty && !DIFFICULTIES.has(difficulty)) return badRequest("difficulty is invalid.");
  if (topic && (topic.length > 140 || !SLUG_PATTERN.test(topic))) return badRequest("topic is invalid.");

  try {
    const supabase = getSupabaseAdminClient();
    const { data: modeRow, error: modeError } = await supabase
      .from("practice_modes")
      .select("id, code")
      .eq("code", mode)
      .eq("is_active", true)
      .maybeSingle();

    if (modeError) throw modeError;
    if (!modeRow) return NextResponse.json({ error: "No active practice mode found." }, { status: 404 });

    let questionType = null;
    if (type) {
      const { data, error } = await supabase
        .from("question_types")
        .select("id, code, default_prep_seconds, default_answer_seconds, default_replay_limit")
        .eq("mode_id", modeRow.id)
        .eq("code", type)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "No active question type found." }, { status: 404 });
      questionType = data;
    }

    let topicRow = null;
    if (topic) {
      const { data, error } = await supabase
        .from("topics")
        .select("id, slug, name")
        .eq("mode_id", modeRow.id)
        .eq("slug", topic)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: "No active topic found." }, { status: 404 });
      topicRow = data;
    }

    let query = supabase
      .from("questions")
      .select("id, code, question_type_id, group_id, topic_id, prompt_text, instruction_text, prep_seconds, answer_seconds, replay_limit, difficulty_level, version, config")
      .eq("mode_id", modeRow.id)
      .eq("status", "ACTIVE");
    if (questionType) query = query.eq("question_type_id", questionType.id);
    if (topicRow) query = query.eq("topic_id", topicRow.id);
    if (difficulty) query = query.eq("difficulty_level", difficulty);

    const { data: questions, error: questionError } = await query.limit(500);
    if (questionError) throw questionError;
    if (!questions?.length) return NextResponse.json({ error: "No matching active question found." }, { status: 404 });

    const question = questions[Math.floor(Math.random() * questions.length)];
    const [typeResult, topicResult, itemsResult, questionAssetsResult, groupResult] = await Promise.all([
      questionType
        ? Promise.resolve({ data: questionType, error: null })
        : supabase.from("question_types").select("code, default_prep_seconds, default_answer_seconds, default_replay_limit").eq("id", question.question_type_id).single(),
      topicRow
        ? Promise.resolve({ data: topicRow, error: null })
        : question.topic_id
          ? supabase.from("topics").select("slug, name").eq("id", question.topic_id).single()
          : Promise.resolve({ data: null, error: null }),
      supabase.from("question_prompt_items").select("item_type, content, sequence_no, is_required").eq("question_id", question.id).order("sequence_no"),
      supabase.from("question_assets").select("asset_type, storage_bucket, storage_path, text_content, mime_type, alt_text, sequence_no").eq("question_id", question.id).order("sequence_no"),
      question.group_id
        ? supabase.from("question_groups").select("id, title, shared_context").eq("id", question.group_id).eq("status", "ACTIVE").maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const relatedError = typeResult.error || topicResult.error || itemsResult.error || questionAssetsResult.error || groupResult.error;
    if (relatedError) throw relatedError;
    if (question.group_id && !groupResult.data) return NextResponse.json({ error: "Question group is inactive." }, { status: 404 });

    let groupAssets: Array<{
      asset_type: string;
      storage_bucket: string | null;
      storage_path: string | null;
      text_content: string | null;
      mime_type: string | null;
      alt_text: string | null;
      sequence_no: number;
    }> = [];
    if (question.group_id) {
      const { data, error } = await supabase
        .from("question_assets")
        .select("asset_type, storage_bucket, storage_path, text_content, mime_type, alt_text, sequence_no")
        .eq("group_id", question.group_id)
        .order("sequence_no");
      if (error) throw error;
      groupAssets = data ?? [];
    }

    const typeData = typeResult.data;
    return NextResponse.json(
      {
        data: {
          id: question.id,
          code: question.code,
          mode: modeRow.code,
          question_type: typeData.code,
          topic: topicResult.data,
          group: groupResult.data,
          prompt_text: question.prompt_text,
          instruction_text: question.instruction_text,
          prompt_items: itemsResult.data ?? [],
          assets: [...groupAssets, ...(questionAssetsResult.data ?? [])],
          difficulty_level: question.difficulty_level,
          prep_seconds: question.prep_seconds ?? typeData.default_prep_seconds,
          answer_seconds: question.answer_seconds ?? typeData.default_answer_seconds,
          replay_limit: question.replay_limit ?? typeData.default_replay_limit,
          version: question.version,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Random question API failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unable to load a random question." }, { status: 500 });
  }
}
