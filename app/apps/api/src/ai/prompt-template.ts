import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LikertAnswer, OceanItem } from "@self-authoring/shared";

interface PromptSection {
  heading?: string;
  body: string;
}

interface PresentPromptConfig {
  preamble: string;
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

let cachedPresentConfig: PresentPromptConfig | null = null;

/** Loads the present authoring overview prompt config. */
function loadPresentPromptConfig(): PresentPromptConfig {
  if (cachedPresentConfig) return cachedPresentConfig;
  const configPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "prompts",
    "present-authoring-prompt.json"
  );
  cachedPresentConfig = JSON.parse(readFileSync(configPath, "utf-8")) as PresentPromptConfig;
  return cachedPresentConfig;
}

/** Assembles a prompt section with an optional heading and body. */
function formatSection(section: PromptSection): string {
  if (section.heading) {
    return `${section.heading}\n${section.body}`;
  }
  return section.body;
}

/** Builds the Present Authoring overview prompt from programme data. */
export function buildPresentOverviewPrompt(
  data: import("@self-authoring/shared").PresentAuthoringData,
  items: OceanItem[]
): string {
  const config = loadPresentPromptConfig();

  const formatPart = (
    partKey: "faults" | "virtues",
    answers: Record<string, LikertAnswer>
  ): string => {
    const pole = partKey === "faults" ? "fault" : "virtue";
    const partItems = items.filter((i) => i.pole === pole);
    const answerLines = partItems.map((item) => {
      const answer = answers[item.id];
      const label = answer ? LIKERT_LABELS[answer] : "No answer";
      return `  "${item.text}" → ${answer ?? "?"} (${label})`;
    });
    const reflections = data[partKey].finalSelections
      .sort((a, b) => a.order - b.order)
      .map((selection) => {
        return [
          `### ${selection.order}. ${selection.text}`,
          `Example: ${selection.reflection.example}`,
          `Lesson: ${selection.reflection.lesson}`,
          selection.reflection.betterOutcome
            ? `Better outcome: ${selection.reflection.betterOutcome}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");
      });
    return [
      `Assessment answers (${partItems.length} items):`,
      answerLines.join("\n"),
      "",
      "Written reflections:",
      reflections.join("\n\n"),
    ].join("\n");
  };

  return [
    config.preamble,
    "",
    "## Faults",
    formatPart("faults", data.faults.assessmentAnswers),
    "",
    "## Virtues",
    formatPart("virtues", data.virtues.assessmentAnswers),
    "",
    formatSection(config.instructions),
    "",
    config.outputSchema.body,
    "",
    config.closing,
  ].join("\n");
}
