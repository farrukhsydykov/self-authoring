import type { LikertAnswer, Pole, PresentAuthoringData, PresentAuthoringItem, PresentAuthoringPartData, PresentPartKey, Trait } from "./index.js";

export const TRAITS: Trait[] = ["O", "C", "E", "A", "N"];

export const PRESENT_FINAL_MIN = 2;
export const PRESENT_FINAL_MAX = 7;

export const PRESENT_FAULT_PROMPTS = {
  example: "Describe a specific time when this fault caused you trouble.",
  lesson: "What might you have done differently?",
  betterOutcome: "What different action might have led to a better outcome?",
} as const;

export const PRESENT_VIRTUE_PROMPTS = {
  example:
    "Describe a specific time when this virtue helped you reach a goal or produce a good outcome.",
  lesson: "How could you use this virtue more effectively in your present or future life?",
} as const;

/** Returns empty trait-keyed arrays for step-one style selections. */
export function emptyTraitMap(): Record<Trait, string[]> {
  return { O: [], C: [], E: [], A: [], N: [] };
}

/** Creates default data for one Present Authoring part. */
export function defaultPresentPart(): PresentAuthoringPartData {
  return {
    step: "instructions",
    assessmentAnswers: {},
    finalSelections: [],
    activeTrait: "O",
    assessmentIndex: 0,
    writeIndex: 0,
  };
}

/** Creates a fresh Present Authoring programme document. */
export function defaultPresentData(): PresentAuthoringData {
  return {
    activePart: "faults",
    faults: defaultPresentPart(),
    virtues: defaultPresentPart(),
  };
}

/** Returns pole for a Present part key. */
export function poleForPart(part: PresentPartKey): Pole {
  return part === "faults" ? "fault" : "virtue";
}

/** Counts answered assessment items for a part. */
export function countAssessmentAnswers(answers: Record<string, LikertAnswer>): number {
  return Object.keys(answers).length;
}

/** Returns true when every item id in the list has a valid Likert answer. */
export function isAssessmentComplete(
  itemIds: string[],
  answers: Record<string, LikertAnswer | number | string>
): boolean {
  return itemIds.every((id) => {
    const value = Number(answers[id]);
    return Number.isInteger(value) && value >= 1 && value <= 5;
  });
}

/** Returns true when a reflection has all required fields filled for the part. */
export function isReflectionComplete(
  item: PresentAuthoringItem,
  part: PresentPartKey
): boolean {
  const { example, lesson, betterOutcome } = item.reflection;
  if (!example?.trim() || !lesson?.trim()) return false;
  if (part === "faults" && !betterOutcome?.trim()) return false;
  return true;
}

/** Returns true when a part has valid final selections and completed reflections. */
export function isPresentPartComplete(
  partData: PresentAuthoringPartData,
  part: PresentPartKey,
  requiredItemIds: string[]
): boolean {
  if (partData.step !== "complete") return false;
  const count = partData.finalSelections.length;
  if (count < PRESENT_FINAL_MIN || count > PRESENT_FINAL_MAX) return false;
  const reflectionsDone = partData.finalSelections.every((item) =>
    isReflectionComplete(item, part)
  );
  if (!reflectionsDone) return false;
  const assessmentDone = isAssessmentComplete(requiredItemIds, partData.assessmentAnswers);
  return assessmentDone || reflectionsDone;
}

/** Returns true when both Faults and Virtues parts are fully complete. */
export function isPresentProgrammeComplete(
  data: PresentAuthoringData,
  faultItemIds: string[],
  virtueItemIds: string[]
): boolean {
  return (
    isPresentPartComplete(data.faults, "faults", faultItemIds) &&
    isPresentPartComplete(data.virtues, "virtues", virtueItemIds)
  );
}

/** Normalizes legacy or partial saved data into the current shape. */
export function normalizePresentData(raw: Partial<PresentAuthoringData>): PresentAuthoringData {
  const base = defaultPresentData();
  const mergePart = (
    key: PresentPartKey,
    source?: Partial<PresentAuthoringPartData>
  ): PresentAuthoringPartData => {
    const defaults = base[key];
    if (!source) return defaults;
    return {
      step: source.step ?? defaults.step,
      assessmentAnswers: { ...defaults.assessmentAnswers, ...(source.assessmentAnswers ?? {}) },
      finalSelections: source.finalSelections ?? defaults.finalSelections,
      activeTrait: source.activeTrait ?? defaults.activeTrait,
      assessmentIndex: source.assessmentIndex ?? defaults.assessmentIndex,
      writeIndex: source.writeIndex ?? defaults.writeIndex,
    };
  };

  return {
    activePart: raw.activePart ?? base.activePart,
    faults: mergePart("faults", raw.faults),
    virtues: mergePart("virtues", raw.virtues),
    overview: raw.overview,
  };
}

/** Maps legacy single-module PresentAuthoringData into a part slice. */
export function legacyPartFromOldData(
  old: {
    step?: string;
    step1Selections?: Record<Trait, string[]>;
    finalSelections?: Array<{
      itemId: string;
      text: string;
      trait: Trait;
      rank?: number;
      negativePastImpact?: string;
      couldHaveDoneDifferently?: string;
      rectifyNowFuture?: string;
    }>;
  },
  part: PresentPartKey
): PresentAuthoringPartData {
  const stepMap: Record<string, PresentAuthoringPartData["step"]> = {
    instructions: "instructions",
    select: "narrow",
    rank: "narrow",
    write: "write",
    conclusion: "complete",
  };
  const finalSelections: PresentAuthoringItem[] = (old.finalSelections ?? []).map((item, index) => ({
    itemId: item.itemId,
    text: item.text,
    trait: item.trait,
    order: item.rank ?? index + 1,
    reflection: {
      example: item.negativePastImpact ?? "",
      lesson: item.couldHaveDoneDifferently ?? "",
      betterOutcome: part === "faults" ? item.rectifyNowFuture ?? "" : undefined,
    },
  }));

  return {
    step: stepMap[old.step ?? "instructions"] ?? "instructions",
    assessmentAnswers: {},
    finalSelections,
    activeTrait: "O",
    assessmentIndex: 0,
    writeIndex: 0,
  };
}
