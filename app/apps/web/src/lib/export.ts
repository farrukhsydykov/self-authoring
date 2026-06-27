import type {
  AuthoringModule,
  FutureAuthoringData,
  PastAuthoringData,
  PresentAuthoringData,
  PresentAuthoringItem,
  PresentPartKey,
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

function formatPartItems(
  items: PresentAuthoringItem[],
  part: PresentPartKey,
  format: Format
): string {
  let out = "";
  const sorted = [...items].sort((a, b) => a.order - b.order);
  for (const item of sorted) {
    out += heading(item.text, 2, format);
    out += line("Trait", TRAIT_LABELS[item.trait], format);
    out += line("Impact order", String(item.order), format);
    if (item.reflection.example) {
      out += heading("Specific Example", 3, format);
      out += `${item.reflection.example}\n\n`;
    }
    if (item.reflection.lesson) {
      const lessonTitle =
        part === "faults" ? "What I Could Have Done Differently" : "Using This Virtue More Effectively";
      out += heading(lessonTitle, 3, format);
      out += `${item.reflection.lesson}\n\n`;
    }
    if (part === "faults" && item.reflection.betterOutcome) {
      out += heading("Better Outcome", 3, format);
      out += `${item.reflection.betterOutcome}\n\n`;
    }
  }
  return out;
}

/** Formats present authoring programme for export. */
export function formatPresentExport(data: PresentAuthoringData, format: Format): string {
  let out = heading("Present Authoring", 1, format);
  out += heading("Faults", 2, format);
  out += formatPartItems(data.faults.finalSelections, "faults", format);
  out += heading("Virtues", 2, format);
  out += formatPartItems(data.virtues.finalSelections, "virtues", format);
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
export function exportModule(module: AuthoringModule, data: unknown, format: Format) {
  let content = "";
  const ext = format;
  if (module === "present") {
    content = formatPresentExport(data as PresentAuthoringData, format);
  } else if (module === "past") {
    content = formatPastExport(data as PastAuthoringData, format);
  } else {
    content = formatFutureExport(data as FutureAuthoringData, format);
  }
  downloadFile(content, `${module}-authoring.${ext}`);
}
