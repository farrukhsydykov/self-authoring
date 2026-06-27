import type {
  AuthoringData,
  AuthoringModule,
  FutureAuthoringData,
  PastAuthoringData,
  PresentAuthoringData,
} from "@self-authoring/shared";
import { FUTURE_IMAGINATION_PROMPTS } from "@self-authoring/shared";
import type { OceanItem } from "@self-authoring/shared";
import oceanItems from "@self-authoring/shared/ocean-items.json";
import { getPresentProgrammeProgress } from "./present-progress";

export interface ModuleProgress {
  percent: number;
  stepLabel: string;
  detail?: string;
  status: CompletionStatus;
}

export type CompletionStatus = "not_started" | "in_progress" | "complete";

const items = oceanItems as OceanItem[];
const faultIds = items.filter((i) => i.pole === "fault").map((i) => i.id);
const virtueIds = items.filter((i) => i.pole === "virtue").map((i) => i.id);

/** Derives a three-state completion label from progress percentage. */
export function getCompletionStatus(percent: number, started: boolean): CompletionStatus {
  if (!started) return "not_started";
  if (percent >= 100) return "complete";
  return "in_progress";
}

/** Computes completion percentage and status label for an authoring module. */
export function getModuleProgress(
  module: AuthoringModule,
  data: AuthoringData | undefined
): ModuleProgress {
  if (!data) {
    return { percent: 0, stepLabel: "Not started", status: "not_started" };
  }

  switch (module) {
    case "present":
      return getPresentProgrammeProgress(data as PresentAuthoringData, faultIds, virtueIds);
    case "faults":
    case "virtues":
      return { percent: 0, stepLabel: "Use Present Authoring", status: "not_started" };
    case "past":
      return { ...getPastProgress(data as PastAuthoringData), status: getCompletionStatus(getPastProgress(data as PastAuthoringData).percent, true) };
    case "future":
      return { ...getFutureProgress(data as FutureAuthoringData), status: getCompletionStatus(getFutureProgress(data as FutureAuthoringData).percent, true) };
    default:
      return { percent: 0, stepLabel: "Not started", status: "not_started" };
  }
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
