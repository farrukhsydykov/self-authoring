import type {
  AuthoringData,
  AuthoringModule,
  FutureAuthoringData,
  PastAuthoringData,
  PresentAuthoringData,
} from "@self-authoring/shared";
import { FUTURE_IMAGINATION_PROMPTS } from "@self-authoring/shared";

export interface ModuleProgress {
  percent: number;
  stepLabel: string;
  detail?: string;
  status: CompletionStatus;
}

export type CompletionStatus = "not_started" | "in_progress" | "complete";

/** Derives a three-state completion label from progress percentage. */
export function getCompletionStatus(percent: number, started: boolean): CompletionStatus {
  if (!started) return "not_started";
  if (percent >= 100) return "complete";
  return "in_progress";
}

/** Computes OCEAN assessment progress from draft answers and saved results. */
export function getOceanProgress(
  answeredCount: number,
  totalItems: number,
  hasSavedResult: boolean
): ModuleProgress {
  if (hasSavedResult) {
    return {
      percent: 100,
      stepLabel: "Complete",
      detail: `${totalItems}/${totalItems} items`,
      status: "complete",
    };
  }
  if (answeredCount > 0) {
    const percent = Math.round((answeredCount / totalItems) * 100);
    return {
      percent,
      stepLabel: "In progress",
      detail: `${answeredCount}/${totalItems} items answered`,
      status: "in_progress",
    };
  }
  return {
    percent: 0,
    stepLabel: "Not started",
    status: "not_started",
  };
}

/** Computes completion percentage and status label for an authoring module. */
export function getModuleProgress(
  module: AuthoringModule,
  data: AuthoringData | undefined
): ModuleProgress {
  if (!data) {
    return { percent: 0, stepLabel: "Not started", status: "not_started" };
  }

  let progress: Omit<ModuleProgress, "status">;
  switch (module) {
    case "faults":
    case "virtues":
      progress = getPresentProgress(data as PresentAuthoringData);
      break;
    case "past":
      progress = getPastProgress(data as PastAuthoringData);
      break;
    case "future":
      progress = getFutureProgress(data as FutureAuthoringData);
      break;
    default:
      return { percent: 0, stepLabel: "Not started", status: "not_started" };
  }

  return {
    ...progress,
    status: getCompletionStatus(progress.percent, true),
  };
}

function getPresentProgress(data: PresentAuthoringData): Omit<ModuleProgress, "status"> {
  const labels: Record<PresentAuthoringData["step"], string> = {
    instructions: "Instructions",
    select: "Selecting traits",
    rank: "Ranking items",
    write: "Writing reflections",
    conclusion: "Complete",
  };

  if (data.step === "conclusion") {
    return { percent: 100, stepLabel: labels.conclusion };
  }

  if (data.step === "write") {
    const total = data.finalSelections.length || 1;
    const done = data.finalSelections.filter(
      (s) => s.negativePastImpact && s.couldHaveDoneDifferently && s.rectifyNowFuture
    ).length;
    return {
      percent: Math.round(55 + (done / total) * 40),
      stepLabel: labels.write,
      detail: `${done}/${total} reflections`,
    };
  }

  const stepWeights: Record<PresentAuthoringData["step"], number> = {
    instructions: 5,
    select: 25,
    rank: 45,
    write: 55,
    conclusion: 100,
  };

  return { percent: stepWeights[data.step], stepLabel: labels[data.step] };
}

function getPastProgress(data: PastAuthoringData): Omit<ModuleProgress, "status"> {
  if (data.step === "summary") {
    const filled = data.epochs.reduce(
      (n, e) => n + e.experiences.filter((x) => x.title || x.howItShapedMe).length,
      0
    );
    return {
      percent: 100,
      stepLabel: "Complete",
      detail: `${filled} experiences recorded`,
    };
  }

  if (data.step === "intro") {
    return { percent: 0, stepLabel: "Instructions" };
  }

  const filledEpochs = data.epochs.filter((e) =>
    e.experiences.some((x) => x.title || x.howItShapedMe)
  ).length;
  return {
    percent: Math.round(10 + (filledEpochs / data.epochs.length) * 80),
    stepLabel: "Recording epochs",
    detail: `${filledEpochs}/${data.epochs.length} epochs`,
  };
}

function getFutureProgress(data: FutureAuthoringData): Omit<ModuleProgress, "status"> {
  if (data.step === "complete") {
    const goals = data.goals.filter((g) => g.title || g.strategy).length;
    return { percent: 100, stepLabel: "Complete", detail: `${goals} goals defined` };
  }

  if (data.step === "instructions") {
    return { percent: 0, stepLabel: "Instructions" };
  }

  if (data.step === "stage1") {
    const filled = FUTURE_IMAGINATION_PROMPTS.filter(
      (p) => (data.imaginationPrompts[p] ?? "").trim().length > 0
    ).length;
    const promptPct = (filled / FUTURE_IMAGINATION_PROMPTS.length) * 40;
    const writePct = data.idealFutureWrite.trim() ? 25 : 0;
    const avoidPct = data.futureToAvoid.trim() ? 10 : 0;
    return {
      percent: Math.round(10 + promptPct + writePct + avoidPct),
      stepLabel: "Stage 1 — Imagination",
      detail: `${filled}/${FUTURE_IMAGINATION_PROMPTS.length} prompts`,
    };
  }

  const filledGoals = data.goals.filter(
    (g) => g.title && g.strategy && g.futureSteps
  ).length;
  return {
    percent: Math.round(60 + (filledGoals / Math.max(data.goals.length, 1)) * 35),
    stepLabel: "Stage 2 — Goals",
    detail: `${filledGoals}/${data.goals.length} goals complete`,
  };
}
