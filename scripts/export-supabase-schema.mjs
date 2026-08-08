import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";

const OUTPUT_FILE = "docs/architecture/question-bank-schema-snapshot.md";
const PUBLIC_TABLES = [
  "practice_modes",
  "question_types",
  "topics",
  "question_groups",
  "questions",
  "question_prompt_items",
  "question_assets",
];

function getSupabaseConfig() {
  const url = process.env.PROJECT_URL?.trim();
  const secretKey = process.env.SECRET_KEY?.trim();
  if (!url || !secretKey) throw new Error("PROJECT_URL and SECRET_KEY are required in .env.");
  return { url, secretKey };
}

async function fetchOpenApiSchema(url, secretKey) {
  const response = await fetch(`${url}/rest/v1/?apikey=${encodeURIComponent(secretKey)}`, {
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/openapi+json",
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAPI schema request failed: HTTP ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function extractTables(openApi) {
  const definitions = openApi.definitions ?? openApi.components?.schemas ?? {};
  return Object.entries(definitions)
    .filter(([name]) => PUBLIC_TABLES.includes(name))
    .map(([name, definition]) => {
      const properties = definition.properties ?? {};
      const required = new Set(definition.required ?? []);
      return {
        name,
        columns: Object.entries(properties).map(([column, metadata]) => ({
          name: column,
          type: metadata.format ? `${metadata.type ?? "unknown"} (${metadata.format})` : metadata.type ?? "unknown",
          nullable: metadata.nullable === true || !required.has(column),
          description: metadata.description ?? "",
        })),
      };
    })
    .sort((a, b) => PUBLIC_TABLES.indexOf(a.name) - PUBLIC_TABLES.indexOf(b.name));
}

async function countRows(supabase, table) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) return null;
  return count;
}

function renderTable(table, rowCount) {
  const lines = [`### ${table.name}`, "", `Current row count: ${rowCount ?? "unavailable"}`, "", "| Column | Type | Nullable | Notes |", "| --- | --- | --- | --- |"];
  for (const column of table.columns) {
    const notes = column.description.replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
    lines.push(`| \`${column.name}\` | ${column.type} | ${column.nullable ? "yes" : "no"} | ${notes} |`);
  }
  return lines.join("\n");
}

const { url, secretKey } = getSupabaseConfig();
const supabase = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const openApi = await fetchOpenApiSchema(url, secretKey);
const tables = extractTables(openApi);
if (!tables.length) throw new Error("No known question-bank tables were found in the Supabase OpenAPI schema.");

const rowCounts = new Map();
for (const table of tables) {
  rowCounts.set(table.name, await countRows(supabase, table.name));
}

const generatedAt = new Date().toISOString();
const markdown = [
  "# Question Bank Schema Snapshot",
  "",
  `Generated from the live Supabase REST/OpenAPI schema at ${generatedAt}.`,
  "",
  "This generated snapshot covers only the seven pre-existing question-bank tables. It does not include the IELTS practice-session tables created by `supabase/migrations/`. It is generated from Supabase rather than copied from design documents because the live database can drift while the app is being built.",
  "",
  ...tables.map((table) => renderTable(table, rowCounts.get(table.name))),
  "",
].join("\n");

await writeFile(OUTPUT_FILE, markdown, "utf8");
console.log(`Wrote ${OUTPUT_FILE}`);
