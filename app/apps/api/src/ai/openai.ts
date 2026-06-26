import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-4o-mini";

export const REASONING_EFFORT_LEVELS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;

export type ReasoningEffortLevel = (typeof REASONING_EFFORT_LEVELS)[number];

let client: OpenAI | null = null;

/** Returns the configured OpenAI client singleton. */
export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

/** Returns the chat model name from env, with a sensible default. */
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
}

/** Returns reasoning effort from env when set (for GPT-5 / reasoning models). */
export function getOpenAIReasoningEffort(): ReasoningEffortLevel | undefined {
  const raw = process.env.OPENAI_REASONING_EFFORT?.trim().toLowerCase();
  if (!raw) return undefined;

  if (!REASONING_EFFORT_LEVELS.includes(raw as ReasoningEffortLevel)) {
    throw new Error(
      `OPENAI_REASONING_EFFORT must be one of: ${REASONING_EFFORT_LEVELS.join(", ")}`
    );
  }

  return raw as ReasoningEffortLevel;
}
