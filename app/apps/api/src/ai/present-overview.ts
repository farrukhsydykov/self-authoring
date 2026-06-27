import type OpenAI from "openai";
import type { PresentAuthoringData, PresentAuthoringOverview } from "@self-authoring/shared";
import {
  getOpenAIClient,
  getOpenAIModel,
  getOpenAIReasoningEffort,
} from "./openai.js";
import { buildPresentOverviewPrompt } from "./prompt-template.js";
import { oceanItems } from "../scoring.js";

const SYSTEM_PROMPT =
  "You are an expert psychologist. Respond only with valid JSON matching the requested schema.";

/** Generates a Present Authoring overview via OpenAI. */
export async function generatePresentOverview(
  data: PresentAuthoringData
): Promise<PresentAuthoringOverview> {
  const prompt = buildPresentOverviewPrompt(data, oceanItems);
  const model = getOpenAIModel();
  const reasoningEffort = getOpenAIReasoningEffort();
  const client = getOpenAIClient();

  if (reasoningEffort) {
    const response = await client.responses.create({
      model,
      reasoning: { effort: reasoningEffort as OpenAI.ReasoningEffort },
      instructions: SYSTEM_PROMPT,
      input: prompt,
      text: { format: { type: "json_object" } },
      max_output_tokens: 8000,
    });
    const content = response.output_text;
    if (!content) throw new Error("OpenAI returned an empty response");
    return JSON.parse(content) as PresentAuthoringOverview;
  }

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
  if (!content) throw new Error("OpenAI returned an empty response");
  return JSON.parse(content) as PresentAuthoringOverview;
}
