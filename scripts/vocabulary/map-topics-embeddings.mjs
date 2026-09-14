import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  balanceAccepted,
  buildSenseEmbedText,
  buildTopicEmbedText,
  rankTopicMatches,
  shouldAutoAccept,
} from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const TOPIC_KEYWORDS = {
  "daily-routine": ["daily routine", "usually", "morning", "habit"],
  "family-and-friends": ["family", "friends", "relationship", "supportive"],
  "food-and-cooking": ["food", "cooking", "ingredients", "meal"],
  shopping: ["shopping", "price", "store", "purchase"],
  travel: ["travel", "trip", "itinerary", "journey"],
  transportation: ["transport", "commute", "bus", "traffic"],
  work: ["work", "job", "office", "career", "deadline"],
  study: ["study", "school", "learn", "assignment"],
  hobbies: ["hobby", "leisure", "interest", "free time"],
  "movies-and-music": ["movie", "music", "film", "song"],
  "health-and-fitness": ["health", "fitness", "exercise", "diet"],
  technology: ["technology", "software", "device", "internet", "application"],
  "home-and-neighborhood": ["home", "house", "neighborhood", "local"],
  "social-situations": ["social", "conversation", "party", "meeting people"],
  "future-plans": ["future", "plan", "goal", "ambition"],
  community: ["community", "volunteer", "local area", "neighbors"],
};

function parseArgs(argv) {
  const args = {
    candidates: path.join(root, "raw_data/vocabulary/candidates.jsonl"),
    accepted: path.join(root, "raw_data/vocabulary/mapped-accepted.jsonl"),
    review: path.join(root, "raw_data/vocabulary/review.jsonl"),
    cache: path.join(root, "raw_data/vocabulary/.cache"),
    limit: 200,
    threshold: 0.28,
    margin: 0.04,
    model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  };
  const rest = [...argv];
  while (rest.length) {
    const token = rest.shift();
    if (token === "--candidates") args.candidates = path.resolve(rest.shift());
    else if (token === "--accepted") args.accepted = path.resolve(rest.shift());
    else if (token === "--review") args.review = path.resolve(rest.shift());
    else if (token === "--limit") args.limit = Number(rest.shift());
    else if (token === "--threshold") args.threshold = Number(rest.shift());
    else if (token === "--margin") args.margin = Number(rest.shift());
    else if (token === "--model") args.model = rest.shift();
  }
  return args;
}

async function readJsonl(filePath) {
  const text = await readFile(filePath, "utf8").catch(() => "");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function writeJsonl(filePath, rows) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : ""), "utf8");
}

function hashText(text) {
  return createHash("sha256").update(text).digest("hex");
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for vocabulary:map`);
  return value;
}

async function loadEmbeddingCache(cacheDir) {
  const file = path.join(cacheDir, "embeddings.json");
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return {};
  }
}

async function saveEmbeddingCache(cacheDir, cache) {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(path.join(cacheDir, "embeddings.json"), JSON.stringify(cache), "utf8");
}

async function embedBatch(texts, model, apiKey) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: texts }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error?.message || `OpenAI embeddings failed (${response.status})`);
  }
  const json = await response.json();
  return json.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
}

async function embedTexts(texts, { model, apiKey, cache, cacheDir }) {
  const embeddings = new Array(texts.length);
  const missingIndexes = [];
  const missingTexts = [];

  for (let i = 0; i < texts.length; i += 1) {
    const key = hashText(`${model}:${texts[i]}`);
    if (cache[key]) {
      embeddings[i] = cache[key];
    } else {
      missingIndexes.push(i);
      missingTexts.push(texts[i]);
    }
  }

  const batchSize = 64;
  for (let start = 0; start < missingTexts.length; start += batchSize) {
    const chunk = missingTexts.slice(start, start + batchSize);
    const vectors = await embedBatch(chunk, model, apiKey);
    for (let offset = 0; offset < chunk.length; offset += 1) {
      const index = missingIndexes[start + offset];
      const key = hashText(`${model}:${texts[index]}`);
      cache[key] = vectors[offset];
      embeddings[index] = vectors[offset];
    }
    await saveEmbeddingCache(cacheDir, cache);
  }

  return embeddings;
}

async function loadGeneralTopics(supabase) {
  const { data: mode, error: modeError } = await supabase
    .from("practice_modes")
    .select("id")
    .eq("code", "GENERAL")
    .eq("is_active", true)
    .maybeSingle();
  if (modeError) throw modeError;
  if (!mode) throw new Error("General practice mode is unavailable");

  const { data, error } = await supabase
    .from("topics")
    .select("id, slug, name, description, difficulty_level, is_active, mode_id")
    .eq("mode_id", mode.id)
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []).map((topic) => ({
    ...topic,
    keywords: TOPIC_KEYWORDS[topic.slug] ?? [topic.name],
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = requireEnv("OPENAI_API_KEY");
  const url = requireEnv("PROJECT_URL");
  const secret = requireEnv("SECRET_KEY");
  const supabase = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const candidates = await readJsonl(args.candidates);
  if (!candidates.length) throw new Error(`No candidates found in ${args.candidates}`);

  const topics = await loadGeneralTopics(supabase);
  if (!topics.length) throw new Error("No active General topics found");

  const cache = await loadEmbeddingCache(args.cache);
  const topicTexts = topics.map((topic) => buildTopicEmbedText(topic));
  const topicEmbeddings = await embedTexts(topicTexts, {
    model: args.model,
    apiKey,
    cache,
    cacheDir: args.cache,
  });
  const topicsWithVectors = topics.map((topic, index) => ({
    ...topic,
    embedding: topicEmbeddings[index],
  }));

  const senseTexts = candidates.map((sense) => buildSenseEmbedText(sense));
  const senseEmbeddings = await embedTexts(senseTexts, {
    model: args.model,
    apiKey,
    cache,
    cacheDir: args.cache,
  });

  const accepted = [];
  const review = [];

  for (let i = 0; i < candidates.length; i += 1) {
    const sense = candidates[i];
    const match = rankTopicMatches(senseEmbeddings[i], topicsWithVectors);
    const row = {
      ...sense,
      topic_id: match.top1?.topicId ?? null,
      topic_slug: match.top1?.slug ?? null,
      level: match.top1?.level && ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(match.top1.level)
        ? match.top1.level
        : "INTERMEDIATE",
      score: match.score,
      margin: match.margin,
      top2_slug: match.top2?.slug ?? null,
      top2_score: match.top2?.score ?? null,
      definition_en: null,
      source: "skypedia",
      source_ref: sense.source_sense_id,
      status: "ACTIVE",
    };

    if (shouldAutoAccept(match.score, match.margin, args.threshold, args.margin)) {
      accepted.push(row);
    } else {
      review.push(row);
    }
  }

  accepted.sort((a, b) => b.score - a.score || b.margin - a.margin);
  const perTopicCap = Math.max(8, Math.ceil(args.limit / Math.max(topics.length, 1)));
  const balanced = balanceAccepted(accepted, args.limit, perTopicCap);

  await writeJsonl(args.accepted, balanced);
  await writeJsonl(args.review, review);
  console.log(`Accepted ${balanced.length} (from ${accepted.length} confident). Review queue: ${review.length}.`);
  console.log(`Wrote ${args.accepted}`);
  console.log(`Wrote ${args.review}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
