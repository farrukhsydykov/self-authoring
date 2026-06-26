import type {
  LikertAnswer,
  OceanItem,
  OceanScores,
  Trait,
  TraitScore,
} from "@self-authoring/shared";
import {
  TRAIT_DESCRIPTIONS,
} from "@self-authoring/shared";
import oceanItems from "@self-authoring/shared/ocean-items.json" with { type: "json" };

const TRAITS: Trait[] = ["O", "C", "E", "A", "N"];
const items = oceanItems as OceanItem[];
const itemMap = new Map(items.map((item) => [item.id, item]));

/** Returns low/medium/high band for a 0-100 score. */
function bandFor(score: number): "low" | "medium" | "high" {
  if (score < 40) return "low";
  if (score < 70) return "medium";
  return "high";
}

/** Computes keyed score for a single item (reverse-keying faults). */
function keyedScore(item: OceanItem, answer: LikertAnswer): number {
  return item.pole === "fault" ? 6 - answer : answer;
}

/** Computes full OCEAN scores from Likert answers. */
export function computeOceanScores(answers: Record<string, LikertAnswer>): OceanScores {
  const traitSums: Record<Trait, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const traitCounts: Record<Trait, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };

  for (const [itemId, answer] of Object.entries(answers)) {
    const item = itemMap.get(itemId);
    if (!item) continue;
    traitSums[item.trait] += keyedScore(item, answer);
    traitCounts[item.trait] += 1;
  }

  const traits = {} as Record<Trait, TraitScore>;
  for (const trait of TRAITS) {
    const count = traitCounts[trait] || 1;
    const avg = traitSums[trait] / count;
    const score = Math.round(((avg - 1) / 4) * 100);
    const band = bandFor(score);
    traits[trait] = {
      trait,
      score,
      band,
      description: TRAIT_DESCRIPTIONS[trait][band],
    };
  }

  const plasticityScore = Math.round((traits.E.score + traits.O.score) / 2);
  const emotionalStability = 100 - traits.N.score;
  const stabilityScore = Math.round(
    (traits.C.score + traits.A.score + emotionalStability) / 3
  );

  return {
    traits,
    plasticity: { score: plasticityScore, band: bandFor(plasticityScore) },
    stability: { score: stabilityScore, band: bandFor(stabilityScore) },
  };
}

export { items as oceanItems };
