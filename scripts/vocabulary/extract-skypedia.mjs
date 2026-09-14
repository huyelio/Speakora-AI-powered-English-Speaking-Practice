import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCandidate } from "./lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);

function usage() {
  console.log("Usage: npm run vocabulary:extract -- <path-to-dictionary_en_vi.db> [--sample 400] [--out raw_data/vocabulary/candidates.jsonl]");
}

function parseArgs(argv) {
  const args = { sample: 400, out: path.join(root, "raw_data/vocabulary/candidates.jsonl"), db: null };
  const rest = [...argv];
  while (rest.length) {
    const token = rest.shift();
    if (token === "--sample") args.sample = Number(rest.shift());
    else if (token === "--out") args.out = path.resolve(rest.shift());
    else if (token === "--help" || token === "-h") args.help = true;
    else if (!token.startsWith("--") && !args.db) args.db = path.resolve(token);
  }
  return args;
}

function loadSqlite() {
  try {
    return require("better-sqlite3");
  } catch {
    throw new Error(
      "better-sqlite3 is required for vocabulary:extract. Run: npm install --save-dev better-sqlite3",
    );
  }
}

function shuffle(items, random = Math.random) {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function extractCandidates(db, sampleSize) {
  const rows = db.prepare(`
    SELECT
      wd.id AS source_sense_id,
      w.word AS word,
      d.definition AS meaning_vi,
      wd.example AS example_sentence,
      d.pos AS pos,
      (
        SELECT p.ipa
        FROM pronunciations p
        WHERE p.word_id = w.id
        ORDER BY CASE p.region
          WHEN 'BrE' THEN 1
          WHEN 'UK' THEN 2
          WHEN 'NAmE' THEN 3
          WHEN 'US' THEN 4
          ELSE 5
        END
        LIMIT 1
      ) AS pronunciation_ipa
    FROM word_definitions wd
    JOIN words w ON w.id = wd.word_id
    JOIN definitions d ON d.id = wd.definition_id
    WHERE wd.example IS NOT NULL
      AND trim(wd.example) <> ''
      AND d.definition IS NOT NULL
      AND trim(d.definition) <> ''
      AND (d.pos IS NULL OR d.pos IN ('N', 'V', 'A', 'D', 'n', 'v', 'a', 'adj', 'adv', 'noun', 'verb'))
      AND instr(w.word, ' ') = 0
      AND length(w.word) BETWEEN 3 AND 18
  `).all();

  const normalized = [];
  for (const row of rows) {
    const candidate = normalizeCandidate({
      source_sense_id: String(row.source_sense_id),
      word: row.word,
      meaning_vi: row.meaning_vi,
      example_sentence: row.example_sentence,
      pronunciation_ipa: row.pronunciation_ipa,
      pos: row.pos,
    });
    if (!candidate || !candidate.pronunciation_ipa) continue;
    normalized.push(candidate);
  }

  return shuffle(normalized).slice(0, sampleSize);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.db) {
    usage();
    process.exit(args.help ? 0 : 1);
  }
  if (!Number.isInteger(args.sample) || args.sample < 1) {
    throw new Error("--sample must be a positive integer");
  }

  const Database = loadSqlite();
  const db = new Database(args.db, { readonly: true, fileMustExist: true });
  const candidates = extractCandidates(db, args.sample);
  db.close();

  await mkdir(path.dirname(args.out), { recursive: true });
  await writeFile(args.out, candidates.map((row) => JSON.stringify(row)).join("\n") + (candidates.length ? "\n" : ""), "utf8");
  console.log(`Wrote ${candidates.length} candidates to ${args.out}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
