import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LikertAnswer, OceanItem, OceanScores, Trait } from "@self-authoring/shared";
import { TRAIT_LABELS } from "@self-authoring/shared";

interface PromptSection {
  heading?: string;
  body: string;
}

interface AssessmentPromptConfig {
  preamble: string;
  scores: { heading: string };
  answers: { heading: string };
  instructions: PromptSection;
  outputSchema: { body: string };
  closing: string;
}

const LIKERT_LABELS: Record<LikertAnswer, string> = {
  1: "Strongly Disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly Agree",
};

const TRAITS: Trait[] = ["O", "C", "E", "A", "N"];

let cachedConfig: AssessmentPromptConfig | null = null;

/** Loads the assessment prompt sections from prompts/assessment-prompt.json. */
function loadPromptConfig(): AssessmentPromptConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "prompts",
    "assessment-prompt.json"
  );
  cachedConfig = JSON.parse(readFileSync(configPath, "utf-8")) as AssessmentPromptConfig;
  return cachedConfig;
}

/** Formats trait scores and meta-scores for the prompt. */
function formatScores(scores: OceanScores): string {
  const lines = TRAITS.map((trait) => {
    const t = scores.traits[trait];
    return `- ${TRAIT_LABELS[trait]}: ${t.score}/100 (${t.band})`;
  });
  lines.push(
    `- Plasticity: ${scores.plasticity.score}/100 (${scores.plasticity.band})`,
    `- Stability: ${scores.stability.score}/100 (${scores.stability.band})`
  );
  return lines.join("\n");
}

/** Formats all 300 item answers grouped by trait. */
function formatAnswers(
  answers: Record<string, LikertAnswer>,
  items: OceanItem[]
): string {
  const sections: string[] = [];

  for (const trait of TRAITS) {
    const traitItems = items.filter((item) => item.trait === trait);
    const lines = traitItems.map((item) => {
      const answer = answers[item.id];
      const label = answer ? LIKERT_LABELS[answer] : "No answer";
      return `  [${item.pole}] "${item.text}" → ${answer ?? "?"} (${label})`;
    });
    sections.push(`### ${TRAIT_LABELS[trait]}\n${lines.join("\n")}`);
  }

  return sections.join("\n\n");
}

/** Assembles a prompt section with an optional heading and body. */
function formatSection(section: PromptSection): string {
  if (section.heading) {
    return `${section.heading}\n${section.body}`;
  }
  return section.body;
}

/** Builds the full analysis prompt from OCEAN scores and answers. */
export function buildAssessmentPrompt(
  scores: OceanScores,
  answers: Record<string, LikertAnswer>,
  items: OceanItem[]
): string {
  const config = loadPromptConfig();

  return [
    config.preamble,
    "",
    config.scores.heading,
    formatScores(scores),
    "",
    config.answers.heading,
    formatAnswers(answers, items),
    "",
    formatSection(config.instructions),
    "",
    config.outputSchema.body,
    "",
    config.closing,
  ].join("\n");
}
