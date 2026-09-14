import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_COLUMNS = ["code", "mode", "type", "topic", "prompt"];
const MODES = new Set(["IELTS", "TOEIC", "GENERAL"]);
const DIFFICULTIES = new Set(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
const STATUSES = new Set(["ACTIVE", "DRAFT", "REVIEW", "ARCHIVED"]);
const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,79}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const modeDefinitions = [
  { code: "IELTS", name: "IELTS Speaking", description: "Practice for IELTS Speaking Parts 1-3.", is_active: true },
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

function usage() {
  console.log("Usage: npm run questions:import -- <file-or-folder> [--dry-run]");
  console.log("Example: npm run questions:import -- raw_data");
}

function normalizeHeader(value) {
  return value.trim().replace(/^\uFEFF/, "").toLowerCase();
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((cells, index) => {
    const record = { __row: index + 2 };
    headers.forEach((header, columnIndex) => {
      record[header] = (cells[columnIndex] ?? "").trim();
    });
    return record;
  });
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function parseInteger(value, field, source) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${source.file}:${source.row}: ${field} must be a non-negative integer.`);
  }
  return parsed;
}

export function cleanRecord(raw, file) {
  const source = `${file}:${raw.__row}`;
  const code = raw.code?.toUpperCase();
  const mode = raw.mode?.toUpperCase();
  const type = raw.type?.toUpperCase();
  const topic = raw.topic?.toLowerCase();
  const prompt = raw.prompt;
  const difficulty = (raw.difficulty || "INTERMEDIATE").toUpperCase();
  const status = (raw.status || "DRAFT").toUpperCase();
  const groupCode = raw.group_code?.toUpperCase() || "";
  const sequence = raw.sequence ? Number.parseInt(raw.sequence, 10) : null;

  const errors = [];
  if (!code || !CODE_PATTERN.test(code)) errors.push("code must be uppercase letters/numbers/underscore and start with a letter");
  if (!mode || !MODES.has(mode)) errors.push("mode must be IELTS, TOEIC, or GENERAL");
  if (!type || !CODE_PATTERN.test(type)) errors.push("type is invalid");
  if (!topic || !SLUG_PATTERN.test(topic)) errors.push("topic must be a lowercase slug, for example daily-routine");
  if (!prompt) errors.push("prompt is required");
  if (!DIFFICULTIES.has(difficulty)) errors.push("difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED");
  if (!STATUSES.has(status)) errors.push("status must be ACTIVE, DRAFT, REVIEW, or ARCHIVED");
  if (groupCode && !CODE_PATTERN.test(groupCode)) errors.push("group_code is invalid");
  if (raw.sequence && (!Number.isInteger(sequence) || sequence < 1)) errors.push("sequence must be a positive integer");

  if (errors.length) {
    throw new Error(`${source}: ${errors.join("; ")}`);
  }

  return {
    file,
    row: raw.__row,
    code,
    mode,
    type,
    topic,
    topicName: raw.topic_name || titleFromSlug(topic),
    prompt,
    bullets: (raw.bullets || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean),
    itemType: (raw.item_type || (type === "IELTS_PART_2_CUE_CARD" ? "BULLET" : "PROMPT_POINT")).toUpperCase(),
    difficulty,
    status,
    instruction: raw.instruction || (type === "IELTS_PART_2_CUE_CARD" ? "You should say:" : null),
    context: raw.context || null,
    groupCode: groupCode || null,
    groupTitle: raw.group_title || (groupCode ? titleFromSlug(groupCode.toLowerCase().replaceAll("_", "-")) : null),
    groupType: (raw.group_type || (type === "IELTS_PART_2_CUE_CARD" ? "CUE_CARD_SET" : "TOPIC_SET")).toUpperCase(),
    sequence,
    prepSeconds: parseInteger(raw.prep_seconds || "", "prep_seconds", { file, row: raw.__row }),
    answerSeconds: parseInteger(raw.answer_seconds || "", "answer_seconds", { file, row: raw.__row }),
    replayLimit: parseInteger(raw.replay_limit || "", "replay_limit", { file, row: raw.__row }),
    sourceName: raw.source_name || "manual-csv-import",
    sourceUrl: raw.source_url || null,
    license: raw.license || "ORIGINAL",
  };
}

export const DEFAULT_GENERAL_TOPIC_COVERAGE = 5;

export function validateGeneralCoverage(records, minimumCount = DEFAULT_GENERAL_TOPIC_COVERAGE) {
  const coverage = new Map();

  for (const record of records) {
    if (record.mode !== "GENERAL" || record.status !== "ACTIVE") continue;
    coverage.set(record.topic, (coverage.get(record.topic) ?? 0) + 1);
  }

  const summaries = [...coverage.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((left, right) => left.topic.localeCompare(right.topic));

  for (const { topic, count } of summaries) {
    if (count < minimumCount) {
      throw new Error(`${topic} has ${count} active question${count === 1 ? "" : "s"}; minimum is ${minimumCount}`);
    }
  }

  return summaries;
}

async function collectCsvFiles(target) {
  const resolved = path.resolve(target);
  const info = await stat(resolved);
  if (info.isFile()) {
    if (path.extname(resolved).toLowerCase() !== ".csv") throw new Error(`${target} is not a CSV file.`);
    return [resolved];
  }

  if (!info.isDirectory()) throw new Error(`${target} is not a file or folder.`);

  const entries = await readdir(resolved, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".csv")
    .map((entry) => path.join(resolved, entry.name))
    .sort();
}

async function readInput(target) {
  const files = await collectCsvFiles(target);
  if (!files.length) throw new Error(`No .csv files found in ${target}.`);

  const records = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const rawRows = parseCsv(text);
    if (!rawRows.length) continue;

    const headers = Object.keys(rawRows[0]).filter((key) => key !== "__row");
    const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
    if (missing.length) throw new Error(`${file}: missing required column(s): ${missing.join(", ")}`);

    records.push(...rawRows.map((row) => cleanRecord(row, path.relative(process.cwd(), file))));
  }

  const seen = new Set();
  for (const record of records) {
    if (seen.has(record.code)) throw new Error(`${record.file}:${record.row}: duplicate code in import batch: ${record.code}`);
    seen.add(record.code);
  }

  validateGeneralCoverage(records);

  return records;
}

function getSupabaseClient() {
  const url = process.env.PROJECT_URL?.trim();
  const secretKey = process.env.SECRET_KEY?.trim();
  if (!url || !secretKey) throw new Error("PROJECT_URL and SECRET_KEY are required in .env.");

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function upsert(supabase, table, rows, onConflict) {
  if (!rows.length) return [];
  const { data, error } = await supabase.from(table).upsert(rows, { onConflict }).select();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function ensureReferenceData(supabase, records) {
  const modeRows = await upsert(supabase, "practice_modes", modeDefinitions, "code");
  const modeByCode = new Map(modeRows.map((row) => [row.code, row]));

  const typeRows = await upsert(
    supabase,
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
  const typeByKey = new Map(typeRows.map((row) => [`${row.mode_id}:${row.code}`, row]));

  for (const record of records) {
    const mode = modeByCode.get(record.mode);
    if (!mode) throw new Error(`${record.file}:${record.row}: unknown mode ${record.mode}`);
    if (!typeByKey.has(`${mode.id}:${record.type}`)) {
      throw new Error(`${record.file}:${record.row}: unknown type ${record.type} for mode ${record.mode}`);
    }
  }

  const topicByImportKey = new Map();
  for (const record of records) {
    const modeId = modeByCode.get(record.mode).id;
    const key = `${modeId}:${record.topic}`;
    if (!topicByImportKey.has(key)) {
      topicByImportKey.set(key, {
        mode_id: modeId,
        slug: record.topic,
        name: record.topicName,
        is_active: true,
      });
    }
  }

  const topicRows = await upsert(supabase, "topics", [...topicByImportKey.values()], "mode_id,slug");
  const topicByKey = new Map(topicRows.map((row) => [`${row.mode_id}:${row.slug}`, row]));

  return { modeByCode, typeByKey, topicByKey };
}

async function importQuestions(records, dryRun) {
  if (!records.length) {
    console.log("No rows to import.");
    return;
  }

  const byMode = records.reduce((acc, record) => {
    acc[record.mode] = (acc[record.mode] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Validated ${records.length} row(s): ${Object.entries(byMode).map(([mode, count]) => `${mode}=${count}`).join(", ")}.`);
  if (dryRun) {
    console.log("Dry run complete. No database changes were made.");
    return;
  }

  const supabase = getSupabaseClient();
  const { modeByCode, typeByKey, topicByKey } = await ensureReferenceData(supabase, records);

  const groupRecords = records.filter((record) => record.groupCode || record.context);
  const uniqueGroups = new Map();
  for (const record of groupRecords) {
    const modeId = modeByCode.get(record.mode).id;
    const topic = topicByKey.get(`${modeId}:${record.topic}`);
    const code = record.groupCode || `${record.code}_GROUP`;
    if (!uniqueGroups.has(code)) {
      uniqueGroups.set(code, {
        mode_id: modeId,
        topic_id: topic.id,
        code,
        group_type: record.groupType,
        title: record.groupTitle || record.prompt,
        shared_context: record.context,
        difficulty_level: record.difficulty,
        status: record.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
        metadata: {
          imported: true,
          source_name: record.sourceName,
          source_url: record.sourceUrl,
          license: record.license,
        },
      });
    }
  }

  const groupRows = await upsert(supabase, "question_groups", [...uniqueGroups.values()], "code");
  const groupByCode = new Map(groupRows.map((row) => [row.code, row]));

  const questionRows = await upsert(
    supabase,
    "questions",
    records.map((record) => {
      const modeId = modeByCode.get(record.mode).id;
      const type = typeByKey.get(`${modeId}:${record.type}`);
      const topic = topicByKey.get(`${modeId}:${record.topic}`);
      const group = record.groupCode ? groupByCode.get(record.groupCode) : record.context ? groupByCode.get(`${record.code}_GROUP`) : null;

      return {
        mode_id: modeId,
        question_type_id: type.id,
        group_id: group?.id ?? null,
        topic_id: topic.id,
        code: record.code,
        sequence_in_group: record.sequence,
        prompt_text: record.prompt,
        instruction_text: record.instruction,
        prep_seconds: record.prepSeconds,
        answer_seconds: record.answerSeconds,
        replay_limit: record.replayLimit,
        difficulty_level: record.difficulty,
        status: record.status,
        version: 1,
        config: {
          imported: true,
          source_file: record.file,
          source_row: record.row,
          source_name: record.sourceName,
          source_url: record.sourceUrl,
          license: record.license,
        },
      };
    }),
    "code",
  );
  const questionByCode = new Map(questionRows.map((row) => [row.code, row]));

  const questionIds = questionRows.map((row) => row.id);
  if (questionIds.length) {
    const { error } = await supabase.from("question_prompt_items").delete().in("question_id", questionIds);
    if (error) throw new Error(`question_prompt_items cleanup: ${error.message}`);
  }

  const promptItems = [];
  for (const record of records) {
    const question = questionByCode.get(record.code);
    record.bullets.forEach((content, index) => {
      promptItems.push({
        question_id: question.id,
        item_type: record.itemType,
        content,
        sequence_no: index + 1,
        is_required: true,
      });
    });
  }

  if (promptItems.length) {
    const { error } = await supabase.from("question_prompt_items").insert(promptItems);
    if (error) throw new Error(`question_prompt_items: ${error.message}`);
  }

  console.log(`Import complete: ${questionRows.length} question(s), ${promptItems.length} prompt item(s), ${groupRows.length} group(s).`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || args.includes("--check");
  const target = args.find((arg) => !arg.startsWith("--"));

  if (!target) {
    usage();
    process.exitCode = 1;
  } else {
    try {
      const records = await readInput(target);
      await importQuestions(records, dryRun);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  }
}
