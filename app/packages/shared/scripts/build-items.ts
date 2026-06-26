/**
 * ONE-TIME / ARCHIVAL ONLY — do not run in normal app startup or Docker builds.
 *
 * The canonical question dataset is packages/shared/ocean-items.json (committed).
 * Notion was scraped once into self-authoring+scraper/; that folder is frozen input.
 * The running app never contacts Notion and never re-reads the scraper directory.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { OceanItem, Pole, Trait } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../../..");

const TAG_TO_TRAIT: Record<string, Trait> = {
  "Openness/Traditionalism": "O",
  "Conscientiousness/Carelessness": "C",
  "Extraversion/Introversion": "E",
  "Agreeable/Assertive": "A",
  "Emotional Stability/Low Stress Tolerance": "N",
};

interface ScrapeRow {
  id: string;
  Name: string;
  Tags: string;
}

/** Maps scrape rows to normalized OCEAN items. */
function mapRows(rows: ScrapeRow[], pole: Pole, dropUntagged = false): OceanItem[] {
  return rows
    .filter((row) => {
      if (dropUntagged && !row.Tags?.trim()) return false;
      return true;
    })
    .map((row) => {
      const trait = TAG_TO_TRAIT[row.Tags];
      if (!trait) {
        throw new Error(`Unknown tag "${row.Tags}" for item "${row.Name}"`);
      }
      return { id: row.id, text: row.Name, trait, pole };
    });
}

const faultsPath = join(
  repoRoot,
  "self-authoring+scraper/present-authoring-faults/step-1/collections/faults/rows.json"
);
const virtuesPath = join(
  repoRoot,
  "self-authoring+scraper/present-authoring-virtues/step-1/collections/virtues/rows.json"
);

const faults = mapRows(JSON.parse(readFileSync(faultsPath, "utf-8")), "fault");
const virtues = mapRows(JSON.parse(readFileSync(virtuesPath, "utf-8")), "virtue", true);
const items: OceanItem[] = [...faults, ...virtues];

if (items.length !== 300) {
  throw new Error(`Expected 300 items, got ${items.length}`);
}

for (const trait of ["O", "C", "E", "A", "N"] as Trait[]) {
  const traitItems = items.filter((i) => i.trait === trait);
  const virtuesCount = traitItems.filter((i) => i.pole === "virtue").length;
  const faultsCount = traitItems.filter((i) => i.pole === "fault").length;
  if (traitItems.length !== 60 || virtuesCount !== 30 || faultsCount !== 30) {
    throw new Error(
      `Trait ${trait}: expected 60 (30+30), got ${traitItems.length} (${virtuesCount}+${faultsCount})`
    );
  }
}

const outPath = join(__dirname, "../ocean-items.json");
writeFileSync(outPath, JSON.stringify(items, null, 2));
console.log(`Wrote ${items.length} items to ${outPath}`);
