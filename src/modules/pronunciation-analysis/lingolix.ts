import "server-only";

import { parsePronunciationAnalysis } from "./schema";
import type {
  PronunciationAnalysisProvider,
  PronunciationAnalysisRequest,
} from "./service";

const LINGOLIX_ENDPOINT = "https://api.lingolix.com/api/pronunciation/v3/check";

type LingolixPronunciationProviderOptions = {
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
};

export class LingolixPronunciationProvider implements PronunciationAnalysisProvider {
  private readonly configuredApiKey?: string;
  private readonly fetch: typeof globalThis.fetch;

  constructor(options: LingolixPronunciationProviderOptions = {}) {
    this.configuredApiKey = options.apiKey;
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  async analyze(input: PronunciationAnalysisRequest) {
    const apiKey = this.configuredApiKey?.trim() || process.env.LINGOLIX_API_KEY?.trim();
    if (!apiKey) throw new Error("LINGOLIX_API_KEY is not configured.");

    const body = new FormData();
    body.set("speechdata", input.audio, input.fileName);
    body.set("sentence", input.sentence);
    body.set("language_code", "en");

    let response: Response;
    try {
      response = await this.fetch(LINGOLIX_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
      });
    } catch {
      throw new Error("Lingolix request failed.");
    }

    if (!response.ok) {
      throw new Error(`Lingolix request failed (${response.status}).`);
    }

    let providerOutput: unknown;
    try {
      providerOutput = await response.json();
      const parsed = parsePronunciationAnalysis(providerOutput);
      return {
        schemaVersion: 1 as const,
        referenceText: input.sentence,
        scoredText: parsed.scoredText,
        languageCode: "en" as const,
        overall: parsed.overall,
        words: parsed.words,
      };
    } catch {
      throw new Error("Lingolix returned an invalid response.");
    }
  }
}
