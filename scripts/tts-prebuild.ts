// Pre-generates shared TTS audio for fixed bank content so no learner waits for OpenAI.
//   npm run tts:prebuild -- --dry-run      counts, estimated cost, what is already cached
//   npm run tts:prebuild                    generates only what is missing
// Covers ACTIVE vocabulary words, ACTIVE IELTS/General question prompts and role-play openings.
// AI-generated, per-learner text is never prebuilt or cached.
// Uses the same request builders and cache keys as GET /api/tts, so prebuilt objects are hits.
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfiguration } from "../src/lib/supabase/config";
import { OpenAIProvider } from "../src/modules/ai-gateway/openai";
import { conversationScenarios } from "../src/modules/conversation/scenario";
import { supabaseTtsStorage, ttsCachePath } from "../src/modules/tts/cache";
import { questionSpeech, rolePlaySpeech, wordSpeech, type SpeechRequest } from "../src/modules/tts/voices";

/** Approximate gpt-4o-mini-tts price per minute of audio; verify on OpenAI's pricing page. */
const USD_PER_AUDIO_MINUTE = 0.015;
/** Rough English speaking rate used only for the estimate. */
const CHARS_PER_SECOND = 14;

const dryRun = process.argv.includes("--dry-run");
const concurrency = Number(process.argv.find(arg => arg.startsWith("--concurrency="))?.split("=")[1] ?? 4);

const { url, secretKey } = getSupabaseConfiguration();
const db = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const storage = supabaseTtsStorage(db);
const provider = new OpenAIProvider();

type Job = { group: string; label: string; request: SpeechRequest; path: string };

async function allRows<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data ?? []).length < 1000) return rows;
  }
}

async function collectJobs(): Promise<Job[]> {
  const words = await allRows<{ word: string }>((from, to) =>
    db.from("vocabulary_items").select("word").eq("status", "ACTIVE").range(from, to));
  const questions = await allRows<{ prompt_text: string; practice_modes: { code: string } | null }>((from, to) =>
    db.from("questions").select("prompt_text, practice_modes:mode_id(code)").eq("status", "ACTIVE").range(from, to) as never);

  const jobs: Job[] = [
    ...words.map(row => ({ group: "Từ vựng", label: row.word, request: wordSpeech(row.word) })),
    ...questions
      .filter(row => row.practice_modes?.code === "IELTS" || row.practice_modes?.code === "GENERAL")
      .map(row => ({ group: `Câu hỏi ${row.practice_modes!.code}`, label: row.prompt_text.slice(0, 40), request: questionSpeech(row.prompt_text) })),
    ...conversationScenarios.map(scenario => ({ group: "Mở đầu role-play", label: scenario.key, request: rolePlaySpeech(scenario.opening, scenario.aiRole) })),
  ].map(job => ({ ...job, path: ttsCachePath(job.request) }));
  // Identical requests share one object; keep the first.
  return [...new Map(jobs.map(job => [job.path, job])).values()];
}

async function pool<T>(items: T[], work: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (next < items.length) await work(items[next++]);
  }));
}

async function main() {
  const jobs = await collectJobs();
  const missing: Job[] = [];
  await pool(jobs, async job => { if (!await storage.download(job.path)) missing.push(job); });

  const summary = new Map<string, { items: number; chars: number; missing: number }>();
  for (const job of jobs) {
    const entry = summary.get(job.group) ?? { items: 0, chars: 0, missing: 0 };
    entry.items += 1; entry.chars += job.request.text.length;
    summary.set(job.group, entry);
  }
  for (const job of missing) summary.get(job.group)!.missing += 1;

  const minutes = (chars: number) => chars / CHARS_PER_SECOND / 60;
  const missingChars = missing.reduce((sum, job) => sum + job.request.text.length, 0);
  console.table(Object.fromEntries([...summary].map(([group, entry]) => [group, {
    "Mục": entry.items, "Ký tự": entry.chars, "Chưa có trong cache": entry.missing, "Phút âm thanh (ước tính)": minutes(entry.chars).toFixed(1),
  }])));
  console.log(`Cần tạo: ${missing.length}/${jobs.length} mục, ~${minutes(missingChars).toFixed(1)} phút âm thanh, ~$${(minutes(missingChars) * USD_PER_AUDIO_MINUTE).toFixed(2)} (ước tính).`);

  if (dryRun) return;

  let done = 0;
  const failures: string[] = [];
  await pool(missing, async job => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const audio = await provider.synthesize(job.request.text, job.request.options);
        await storage.upload(job.path, audio);
        done += 1;
        if (done % 25 === 0) console.log(`  ${done}/${missing.length}`);
        return;
      } catch (error) {
        if (attempt === 2) failures.push(`${job.group} · ${job.label}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
  });
  console.log(`Đã tạo ${done}/${missing.length}.`);
  if (failures.length) {
    console.log(`Lỗi ${failures.length} mục (chạy lại lệnh để thử tiếp):\n${failures.join("\n")}`);
    process.exitCode = 1;
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
