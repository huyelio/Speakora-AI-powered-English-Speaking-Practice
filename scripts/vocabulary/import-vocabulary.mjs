import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { isActiveGeneralTopic } from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  const args = {
    input: path.join(root, "raw_data/vocabulary/mapped-accepted.jsonl"),
    dryRun: false,
  };
  const rest = [...argv];
  while (rest.length) {
    const token = rest.shift();
    if (token === "--input") args.input = path.resolve(rest.shift());
    else if (token === "--dry-run") args.dryRun = true;
  }
  return args;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for vocabulary:import`);
  return value;
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function resolveTopicId(row, topicById, topicBySlug) {
  if (row.topic_id && topicById.has(row.topic_id)) return row.topic_id;
  if (row.topic_slug && topicBySlug.has(row.topic_slug)) return topicBySlug.get(row.topic_slug).id;
  return null;
}

export function validateImportRow(row, topicById, topicBySlug, generalModeId) {
  const errors = [];
  if (!row.word?.trim()) errors.push("word is required");
  if (!row.meaning_vi?.trim()) errors.push("meaning_vi is required");
  if (!row.example_sentence?.trim()) errors.push("example_sentence is required");
  if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(row.level)) {
    errors.push("level must be BEGINNER, INTERMEDIATE, or ADVANCED");
  }
  const topicId = resolveTopicId(row, topicById, topicBySlug);
  if (!topicId) errors.push("topic_id or topic_slug must map to an existing topic");
  else {
    const topic = topicById.get(topicId);
    if (!isActiveGeneralTopic(topic, generalModeId)) {
      errors.push(`topic ${topicId} is not an active General topic`);
    }
  }
  if (!row.source || !row.source_ref) errors.push("source and source_ref are required for idempotent import");
  return { errors, topicId };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = requireEnv("PROJECT_URL");
  const secret = requireEnv("SECRET_KEY");
  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rows = await readJsonl(args.input);
  if (!rows.length) throw new Error(`No rows in ${args.input}`);

  const { data: mode, error: modeError } = await supabase
    .from("practice_modes")
    .select("id")
    .eq("code", "GENERAL")
    .eq("is_active", true)
    .maybeSingle();
  if (modeError) throw modeError;
  if (!mode) throw new Error("General practice mode is unavailable");

  const { data: topics, error: topicError } = await supabase
    .from("topics")
    .select("id, slug, name, is_active, mode_id")
    .eq("mode_id", mode.id);
  if (topicError) throw topicError;

  const topicById = new Map((topics ?? []).map((topic) => [topic.id, topic]));
  const topicBySlug = new Map((topics ?? []).map((topic) => [topic.slug, topic]));
  const valid = [];
  const invalid = [];

  for (const row of rows) {
    const { errors, topicId } = validateImportRow(row, topicById, topicBySlug, mode.id);
    if (errors.length) invalid.push({ row, errors });
    else valid.push({ ...row, topic_id: topicId });
  }

  if (invalid.length) {
    console.error(`Validation failed for ${invalid.length} rows:`);
    for (const item of invalid.slice(0, 10)) {
      console.error(`- ${item.row.word || item.row.source_ref}: ${item.errors.join("; ")}`);
    }
    process.exit(1);
  }

  const counts = new Map();
  for (const row of valid) {
    counts.set(row.topic_id, (counts.get(row.topic_id) ?? 0) + 1);
  }

  console.log(`Validated ${valid.length} vocabulary items.`);
  for (const [topicId, count] of counts) {
    const topic = topicById.get(topicId);
    console.log(`  ${topic?.slug ?? topicId}: ${count}`);
  }

  if (args.dryRun) {
    console.log("Dry run only; no rows imported.");
    return;
  }

  const payload = valid.map((row) => ({
    topic_id: row.topic_id,
    word: row.word.trim(),
    meaning_vi: row.meaning_vi.trim(),
    definition_en: row.definition_en ?? null,
    example_sentence: row.example_sentence.trim(),
    pronunciation_ipa: row.pronunciation_ipa ?? null,
    level: row.level,
    status: row.status || "ACTIVE",
    source: row.source,
    source_ref: String(row.source_ref),
    updated_at: new Date().toISOString(),
  }));

  const chunkSize = 50;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("vocabulary_items")
      .upsert(chunk, { onConflict: "source,source_ref" });
    if (error) throw error;
  }

  console.log(`Imported ${payload.length} vocabulary items.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
