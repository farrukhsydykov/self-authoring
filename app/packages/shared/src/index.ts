export type Trait = "O" | "C" | "E" | "A" | "N";
export type Pole = "virtue" | "fault";

export interface OceanItem {
  id: string;
  text: string;
  trait: Trait;
  pole: Pole;
}

export type AuthoringModule = "past" | "future" | "faults" | "virtues";

export type LikertAnswer = 1 | 2 | 3 | 4 | 5;

export interface TraitScore {
  trait: Trait;
  score: number;
  band: "low" | "medium" | "high";
  description: string;
}

export interface OceanScores {
  traits: Record<Trait, TraitScore>;
  plasticity: { score: number; band: "low" | "medium" | "high" };
  stability: { score: number; band: "low" | "medium" | "high" };
}

export interface PresentAuthoringItem {
  itemId: string;
  text: string;
  trait: Trait;
  rank?: number;
  negativePastImpact?: string;
  couldHaveDoneDifferently?: string;
  rectifyNowFuture?: string;
}

export interface PresentAuthoringData {
  step: "instructions" | "select" | "rank" | "write" | "conclusion";
  step1Selections: Record<Trait, string[]>;
  finalSelections: PresentAuthoringItem[];
}

export interface PastExperience {
  title: string;
  howItShapedMe: string;
}

export interface PastEpoch {
  label: string;
  experiences: PastExperience[];
}

export interface PastAuthoringData {
  step: "intro" | "epochs" | "summary";
  epochs: PastEpoch[];
}

export interface FutureGoal {
  title: string;
  strategy: string;
  futureSteps: string;
}

export interface FutureAuthoringData {
  step: "instructions" | "stage1" | "stage2" | "complete";
  imaginationPrompts: Record<string, string>;
  idealFutureWrite: string;
  futureToAvoid: string;
  themeTitle: string;
  goals: FutureGoal[];
}

export type AuthoringData =
  | PresentAuthoringData
  | PastAuthoringData
  | FutureAuthoringData;

export interface PersonalityPortraitTrait {
  trait: string;
  score: number;
  band: string;
  interpretation: string;
  facets: string[];
}

export interface PersonalityPortrait {
  summary: string;
  traits: PersonalityPortraitTrait[];
  strengths: string[];
  challenges: string[];
  interpersonalStyle: string;
  workStyle: string;
  emotionalPattern: string;
  growthRecommendations: string[];
}

export const TRAIT_LABELS: Record<Trait, string> = {
  O: "Openness",
  C: "Conscientiousness",
  E: "Extraversion",
  A: "Agreeableness",
  N: "Emotional Stability",
};

export const TRAIT_DESCRIPTIONS: Record<Trait, { low: string; medium: string; high: string }> = {
  O: {
    low: "You tend toward traditional, practical thinking and prefer familiar approaches.",
    medium: "You balance openness to new ideas with practical considerations.",
    high: "You are imaginative, curious, and drawn to novel ideas and experiences.",
  },
  C: {
    low: "You are spontaneous and flexible, sometimes at the expense of structure.",
    medium: "You balance organization with adaptability.",
    high: "You are disciplined, organized, and goal-directed.",
  },
  E: {
    low: "You are reserved, reflective, and energized by solitude.",
    medium: "You balance social engagement with quiet reflection.",
    high: "You are outgoing, enthusiastic, and energized by social interaction.",
  },
  A: {
    low: "You are direct, competitive, and willing to assert your interests.",
    medium: "You balance cooperation with self-advocacy.",
    high: "You are compassionate, cooperative, and considerate of others.",
  },
  N: {
    low: "You may experience more negative emotions and stress reactivity.",
    medium: "You experience a typical range of emotional ups and downs.",
    high: "You are calm, resilient, and emotionally stable under pressure.",
  },
};

export const FUTURE_IMAGINATION_PROMPTS = [
  "What would your ideal living situation be?",
  "What would your ideal career or work life look like?",
  "What would your ideal social life and relationships look like?",
  "What would your ideal leisure activities be?",
  "What would your ideal family life look like?",
  "What would your ideal health and fitness look like?",
  "What would your ideal personal growth involve?",
  "What would give your life the most meaning?",
];

export const DEFAULT_PAST_EPOCHS = [
  "Early Childhood",
  "Childhood",
  "Adolescence",
  "Young Adulthood",
  "Adulthood",
  "Middle Age",
  "Later Life",
];
