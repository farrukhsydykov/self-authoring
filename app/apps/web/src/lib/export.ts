import type {
  AuthoringModule,
  FutureAuthoringData,
  OceanScores,
  PastAuthoringData,
  PresentAuthoringData,
  Trait,
} from "@self-authoring/shared";
import { TRAIT_LABELS } from "@self-authoring/shared";

type Format = "md" | "txt";

function heading(text: string, level: number, format: Format): string {
  if (format === "md") return `${"#".repeat(level)} ${text}\n\n`;
  return `${text}\n${"=".repeat(Math.min(text.length, 40))}\n\n`;
}

function line(label: string, value: string, format: Format): string {
  if (format === "md") return `**${label}:** ${value}\n\n`;
  return `${label}: ${value}\n\n`;
}

/** Triggers a client-side file download. */
export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Formats OCEAN scores for export. */
export function formatOceanExport(
  scores: OceanScores,
  createdAt: string,
  format: Format
): string {
  let out = heading("OCEAN Personality Assessment Results", 1, format);
  out += line("Date", new Date(createdAt).toLocaleString(), format);
  out += heading("Trait Scores", 2, format);

  for (const trait of ["O", "C", "E", "A", "N"] as Trait[]) {
    const t = scores.traits[trait];
    out += heading(TRAIT_LABELS[trait], 3, format);
    out += line("Score", `${t.score}/100 (${t.band})`, format);
    out += `${t.description}\n\n`;
  }

  out += heading("Higher-Order Factors", 2, format);
  out += line("Plasticity", `${scores.plasticity.score}/100 (${scores.plasticity.band})`, format);
  out += line("Stability", `${scores.stability.score}/100 (${scores.stability.band})`, format);
  return out;
}

/** Formats present authoring (faults/virtues) for export. */
export function formatPresentExport(
  data: PresentAuthoringData,
  moduleLabel: string,
  format: Format
): string {
  let out = heading(`Present Authoring — ${moduleLabel}`, 1, format);
  for (const item of data.finalSelections) {
    out += heading(item.text, 2, format);
    out += line("Trait", TRAIT_LABELS[item.trait], format);
    if (item.rank != null) out += line("Rank", String(item.rank), format);
    if (item.negativePastImpact) {
      out += heading("Negative Past Impact", 3, format);
      out += `${item.negativePastImpact}\n\n`;
    }
    if (item.couldHaveDoneDifferently) {
      out += heading("What I Could Have Done Differently", 3, format);
      out += `${item.couldHaveDoneDifferently}\n\n`;
    }
    if (item.rectifyNowFuture) {
      out += heading("How to Rectify Now and in the Future", 3, format);
      out += `${item.rectifyNowFuture}\n\n`;
    }
  }
  return out;
}

/** Formats past authoring for export. */
export function formatPastExport(data: PastAuthoringData, format: Format): string {
  let out = heading("Past Authoring", 1, format);
  for (const epoch of data.epochs) {
    out += heading(epoch.label, 2, format);
    for (const exp of epoch.experiences) {
      if (!exp.title && !exp.howItShapedMe) continue;
      out += heading(exp.title || "Experience", 3, format);
      out += `${exp.howItShapedMe}\n\n`;
    }
  }
  return out;
}

/** Formats future authoring for export. */
export function formatFutureExport(data: FutureAuthoringData, format: Format): string {
  let out = heading("Future Authoring", 1, format);
  out += heading("Stage 1 — Imagination", 2, format);
  for (const [prompt, answer] of Object.entries(data.imaginationPrompts)) {
    if (!answer) continue;
    out += heading(prompt, 3, format);
    out += `${answer}\n\n`;
  }
  if (data.idealFutureWrite) {
    out += heading("Ideal Future (Free Write)", 3, format);
    out += `${data.idealFutureWrite}\n\n`;
  }
  if (data.futureToAvoid) {
    out += heading("Future to Avoid", 3, format);
    out += `${data.futureToAvoid}\n\n`;
  }
  out += heading("Stage 2 — Goals", 2, format);
  if (data.themeTitle) out += line("Theme", data.themeTitle, format);
  for (const goal of data.goals) {
    if (!goal.title) continue;
    out += heading(goal.title, 3, format);
    if (goal.strategy) {
      out += heading("Strategy", 4, format);
      out += `${goal.strategy}\n\n`;
    }
    if (goal.futureSteps) {
      out += heading("Future Steps", 4, format);
      out += `${goal.futureSteps}\n\n`;
    }
  }
  return out;
}

/** Exports any module data in the chosen format. */
export function exportModule(
  module: AuthoringModule,
  data: unknown,
  format: Format
) {
  let content = "";
  const ext = format;
  if (module === "faults") {
    content = formatPresentExport(data as PresentAuthoringData, "Faults", format);
  } else if (module === "virtues") {
    content = formatPresentExport(data as PresentAuthoringData, "Virtues", format);
  } else if (module === "past") {
    content = formatPastExport(data as PastAuthoringData, format);
  } else {
    content = formatFutureExport(data as FutureAuthoringData, format);
  }
  downloadFile(content, `${module}-authoring.${ext}`);
}
