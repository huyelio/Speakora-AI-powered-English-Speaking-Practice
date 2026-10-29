// Generates one cover illustration per role-play scenario for the /conversation catalog.
//   npm run conversation:art -- --dry-run        lists what would be generated
//   npm run conversation:art                      generates only missing files
//   npm run conversation:art -- --only=<key>      (re)generates one scenario, overwriting it
//   npm run conversation:art -- --force           regenerates every scenario
//   add --avatars to any of the above              AI partner portraits instead of covers
// Output: public/images/conversation/<scenario key>.webp (768×512)
//     and public/images/conversation/avatars/<scenario key>.webp (192×192).
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { conversationScenarios } from "../src/modules/conversation/scenario";

/** Approximate price of one 1536×1024 low-quality image; verify on OpenAI's pricing page. */
const USD_PER_IMAGE = 0.02;
const MODEL = process.env.OPENAI_IMAGE_MODEL ?? "chatgpt-image-latest";
const OUT_DIR = join(process.cwd(), "public", "images", "conversation");
// Natural, varied colours on purpose: an all-orange palette made the catalog look monotonous.
const STYLE = "Friendly digital illustration, soft natural lighting, natural varied colors, no text.";

const scenes: Record<string, string> = {
  "airplane-chat-v1": "Two passengers chatting happily in their seats inside an airplane cabin, window beside them.",
  "ordering-at-a-cafe-v1": "A customer ordering at a cozy café counter from a smiling barista.",
  "hotel-check-in-v1": "A traveller with a suitcase checking in at a hotel reception desk.",
  "restaurant-problem-v1": "A diner politely explaining a problem with their dish to a waiter in a restaurant.",
  "party-meeting-v1": "Two young adults meeting and chatting at a casual house party.",
  "first-day-at-work-v1": "A new employee greeting a friendly colleague in a bright office on their first day.",
  "first-date-v1": "Two adults on a slightly shy first date at a café table.",
  "awkward-remark-v1": "Two friends talking, one looking embarrassed after saying something awkward.",
  "apologizing-after-argument-v1": "One friend apologizing sincerely to another on a park bench.",
  "reconnecting-v1": "Two old friends happily surprised to meet again on a city street.",
};

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const only = process.argv.find((arg) => arg.startsWith("--only="))?.split("=")[1];
const avatars = process.argv.includes("--avatars");
const outDir = avatars ? join(OUT_DIR, "avatars") : OUT_DIR;

/** The portrait shows the role the AI plays, taken from the scenario itself. */
function prompt(key: string): string {
  if (!avatars) return `${scenes[key]} ${STYLE}`;
  const role = conversationScenarios.find((scenario) => scenario.key === key)!.aiRole.replace(/.$/, "");
  return `Head-and-shoulders portrait of ${role.charAt(0).toLowerCase()}${role.slice(1)}, smiling and looking at the viewer, simple softly blurred background. ${STYLE}`;
}

async function generate(text: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set (scripts read .env).");
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: text, size: avatars ? "1024x1024" : "1536x1024", quality: "low" }),
  });
  const result = await response.json() as { data?: { b64_json?: string }[]; error?: { message: string } };
  const image = result.data?.[0]?.b64_json;
  if (!response.ok || !image) throw new Error(result.error?.message ?? `Image request failed (${response.status}).`);
  return sharp(Buffer.from(image, "base64")).resize(avatars ? 192 : 768, avatars ? 192 : 512).webp({ quality: 82 }).toBuffer();
}

async function main() {
  const missingScene = conversationScenarios.filter((scenario) => !scenes[scenario.key]);
  if (missingScene.length) throw new Error(`No scene prompt for: ${missingScene.map((scenario) => scenario.key).join(", ")}`);

  const jobs = conversationScenarios
    .filter((scenario) => only ? scenario.key === only : force || !existsSync(join(outDir, `${scenario.key}.webp`)))
    .map((scenario) => scenario.key);
  if (only && jobs.length === 0) throw new Error(`Unknown scenario key: ${only}`);
  console.log(`${jobs.length} image(s) to generate with ${MODEL}, about $${(jobs.length * USD_PER_IMAGE).toFixed(2)}.`);
  if (dryRun) { for (const key of jobs) console.log(`  ${key}`); return; }

  await mkdir(outDir, { recursive: true });
  // A few at a time keeps the run short without hitting image rate limits.
  let failed = 0;
  for (let i = 0; i < jobs.length; i += 3) {
    await Promise.all(jobs.slice(i, i + 3).map(async (key) => {
      try {
        await sharp(await generate(prompt(key))).toFile(join(outDir, `${key}.webp`));
        console.log(`  ✓ ${key}`);
      } catch (error) {
        failed += 1;
        console.error(`  ✗ ${key}: ${(error as Error).message}`);
      }
    }));
  }
  if (failed) process.exitCode = 1;
}

void main();
