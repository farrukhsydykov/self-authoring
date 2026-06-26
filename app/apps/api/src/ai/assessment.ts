import type OpenAI from "openai";
import type { LikertAnswer, OceanScores, PersonalityPortrait } from "@self-authoring/shared";
import {
  getOpenAIClient,
  getOpenAIModel,
  getOpenAIReasoningEffort,
} from "./openai.js";
import { buildAssessmentPrompt } from "./prompt-template.js";
import { oceanItems } from "../scoring.js";

const SYSTEM_PROMPT =
  "You are an expert psychologist. Respond only with valid JSON matching the requested schema.";

/** Generates a personality portrait using the Responses API with reasoning. */
async function generateWithReasoning(
  prompt: string,
  model: string,
  effort: NonNullable<ReturnType<typeof getOpenAIReasoningEffort>>
): Promise<PersonalityPortrait> {
  const client = getOpenAIClient();

  const response = await client.responses.create({
    model,
    reasoning: { effort: effort as OpenAI.ReasoningEffort },
    instructions: SYSTEM_PROMPT,
    input: prompt,
    text: { format: { type: "json_object" } },
    max_output_tokens: 25000,
  });

  if (response.status === "incomplete") {
    throw new Error("OpenAI response incomplete — try a higher max_output_tokens or lower reasoning effort");
  }

  const content = response.output_text;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  return JSON.parse(content) as PersonalityPortrait;
}

/** Generates a personality portrait using Chat Completions (non-reasoning models). */
async function generateWithChatCompletions(prompt: string, model: string): Promise<PersonalityPortrait> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  return JSON.parse(content) as PersonalityPortrait;
}

/** Generates a personality portrait from OCEAN scores and answers via OpenAI. */
export async function generatePersonalityPortrait(
  scores: OceanScores,
  answers: Record<string, LikertAnswer>
): Promise<PersonalityPortrait> {
  const prompt = buildAssessmentPrompt(scores, answers, oceanItems);
  const model = getOpenAIModel();
  const reasoningEffort = getOpenAIReasoningEffort();

  if (reasoningEffort) {
    return generateWithReasoning(prompt, model, reasoningEffort);
  }

  return generateWithChatCompletions(prompt, model);
}
