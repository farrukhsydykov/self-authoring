import type {
  PresentAuthoringData,
  PresentAuthoringItem,
  PresentAuthoringPartData,
  PresentPartKey,
} from "@self-authoring/shared";
import {
  countAssessmentAnswers,
  isAssessmentComplete,
  isPresentPartComplete,
  isPresentProgrammeComplete,
  isReflectionComplete,
  PRESENT_FINAL_MAX,
  PRESENT_FINAL_MIN,
} from "@self-authoring/shared";

export interface PartProgress {
  percent: number;
  stepLabel: string;
  detail?: string;
  status: "not_started" | "in_progress" | "complete";
}

/** Computes progress for one Present Authoring part. */
export function getPresentPartProgress(
  partData: PresentAuthoringPartData,
  part: PresentPartKey,
  totalAssessmentItems: number,
  itemIds: string[]
): PartProgress {
  const labels: Record<PresentAuthoringPartData["step"], string> = {
    instructions: "Instructions",
    assessment: "150-item assessment",
    narrow: "Narrowing traits",
    write: "Writing reflections",
    complete: "Complete",
  };

  if (isPresentPartComplete(partData, part, itemIds)) {
    return { percent: 100, stepLabel: "Complete", status: "complete" };
  }

  const answered = countAssessmentAnswers(partData.assessmentAnswers);
  const started =
    partData.step !== "instructions" ||
    answered > 0 ||
    partData.finalSelections.length > 0;

  if (!started) {
    return { percent: 0, stepLabel: "Not started", status: "not_started" };
  }

  if (partData.step === "assessment") {
    const pct = Math.round((answered / totalAssessmentItems) * 45);
    return {
      percent: Math.max(5, pct),
      stepLabel: labels.assessment,
      detail: `${answered}/${totalAssessmentItems} answered`,
      status: "in_progress",
    };
  }

  if (partData.step === "narrow") {
    const count = partData.finalSelections.length;
    return {
      percent: 50,
      stepLabel: labels.narrow,
      detail: `${count} selected (${PRESENT_FINAL_MIN}-${PRESENT_FINAL_MAX})`,
      status: "in_progress",
    };
  }

  if (partData.step === "write") {
    const total = partData.finalSelections.length || 1;
    const done = partData.finalSelections.filter((s) => isReflectionComplete(s, part)).length;
    return {
      percent: Math.round(55 + (done / total) * 40),
      stepLabel: labels.write,
      detail: `${done}/${total} reflections`,
      status: "in_progress",
    };
  }

  const stepWeights: Record<PresentAuthoringPartData["step"], number> = {
    instructions: 5,
    assessment: 10,
    narrow: 50,
    write: 55,
    complete: 100,
  };

  return {
    percent: stepWeights[partData.step],
    stepLabel: labels[partData.step],
    status: "in_progress",
  };
}

/** Computes aggregate progress for the full Present programme. */
export function getPresentProgrammeProgress(
  data: PresentAuthoringData,
  faultItemIds: string[],
  virtueItemIds: string[]
): PartProgress {
  const faults = getPresentPartProgress(data.faults, "faults", faultItemIds.length, faultItemIds);
  const virtues = getPresentPartProgress(
    data.virtues,
    "virtues",
    virtueItemIds.length,
    virtueItemIds
  );

  if (faults.status === "complete" && virtues.status === "complete") {
    return { percent: 100, stepLabel: "Complete", status: "complete" };
  }

  const percent = Math.round((faults.percent + virtues.percent) / 2);
  const inProgress = faults.status === "in_progress" || virtues.status === "in_progress";
  return {
    percent,
    stepLabel: inProgress ? "In progress" : "Not started",
    detail: `Faults ${faults.percent}% · Virtues ${virtues.percent}%`,
    status: inProgress ? "in_progress" : "not_started",
  };
}

/** Validates narrow-step selections. */
export function isNarrowSelectionValid(items: PresentAuthoringItem[]): boolean {
  const count = items.length;
  if (count < PRESENT_FINAL_MIN || count > PRESENT_FINAL_MAX) return false;
  const orders = items.map((i) => i.order).sort((a, b) => a - b);
  return orders.every((order, index) => order === index + 1);
}

/** Returns true when assessment gate is satisfied for advancing to narrow. */
export function canStartNarrow(
  partData: PresentAuthoringPartData,
  itemIds: string[]
): boolean {
  return isAssessmentComplete(itemIds, partData.assessmentAnswers);
}

export { isPresentProgrammeComplete, isPresentPartComplete, isReflectionComplete };
