import { useEffect, useMemo, useState } from "react";
import type {
  AuthoringModule,
  OceanItem,
  PresentAuthoringData,
  PresentAuthoringItem,
  Trait,
} from "@self-authoring/shared";
import { TRAIT_LABELS } from "@self-authoring/shared";
import oceanItems from "@self-authoring/shared/ocean-items.json";
import { api } from "../lib/api";
import { useAutosave } from "../lib/useAutosave";
import { exportModule } from "../lib/export";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ExportButtons } from "../components/ExportButtons";

const TRAITS: Trait[] = ["O", "C", "E", "A", "N"];
const items = oceanItems as OceanItem[];

const emptySelections = (): Record<Trait, string[]> => ({
  O: [],
  C: [],
  E: [],
  A: [],
  N: [],
});

const defaultData = (): PresentAuthoringData => ({
  step: "instructions",
  step1Selections: emptySelections(),
  finalSelections: [],
});

/** Ensures saved documents always have a complete shape. */
function normalizeData(raw: Partial<PresentAuthoringData>): PresentAuthoringData {
  const base = defaultData();
  return {
    step: raw.step ?? base.step,
    step1Selections: { ...base.step1Selections, ...(raw.step1Selections ?? {}) },
    finalSelections: raw.finalSelections ?? [],
  };
}

interface Props {
  module: AuthoringModule;
}

const MODULE_META = {
  faults: {
    title: "Present Authoring — Faults",
    pole: "fault" as const,
    intro:
      "Select 2–10 faults per trait, then narrow to 6–9 most impactful faults. Write about how each has affected you, what you could have done differently, and how to rectify it.",
  },
  virtues: {
    title: "Present Authoring — Virtues",
    pole: "virtue" as const,
    intro:
      "Select 2–10 virtues per trait, then narrow to 6–9 most meaningful virtues. Write about how each has positively shaped your life and how to cultivate it further.",
  },
};

/** Present authoring flow for faults or virtues. */
export function PresentAuthoringPage({ module }: Props) {
  const meta = MODULE_META[module as "faults" | "virtues"];
  const moduleItems = useMemo(
    () => items.filter((i) => i.pole === meta.pole),
    [meta.pole]
  );
  const [data, setData] = useState<PresentAuthoringData>(defaultData);
  const [loaded, setLoaded] = useState(false);
  const [writeIndex, setWriteIndex] = useState(0);
  const [traitTab, setTraitTab] = useState<Trait>("O");

  useAutosave(module, data, loaded);

  useEffect(() => {
    setLoaded(false);
    setData(defaultData());
    setWriteIndex(0);
    setTraitTab("O");

    api<{ document: { data: PresentAuthoringData } | null }>(`/authoring/${module}`)
      .then((r) => {
        if (r.document?.data) setData(normalizeData(r.document.data));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [module]);

  useEffect(() => {
    if (data.step !== "write") return;
    const sorted = [...data.finalSelections].sort(
      (a, b) => (a.rank ?? 99) - (b.rank ?? 99)
    );
    if (!sorted[writeIndex]) {
      setData((d) => ({ ...d, step: "conclusion" }));
    }
  }, [data.step, data.finalSelections, writeIndex]);

  const itemsByTrait = (trait: Trait) =>
    moduleItems.filter((i) => i.trait === trait);

  const toggleSelection = (trait: Trait, id: string) => {
    setData((d) => {
      const current = d.step1Selections[trait];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length < 10
          ? [...current, id]
          : current;
      return { ...d, step1Selections: { ...d.step1Selections, [trait]: next } };
    });
  };

  const allStep1Valid = TRAITS.every((t) => {
    const n = data.step1Selections[t]?.length ?? 0;
    return n >= 2 && n <= 10;
  });

  const selectionPool = useMemo(() => {
    const pool: PresentAuthoringItem[] = [];
    for (const trait of TRAITS) {
      for (const id of data.step1Selections[trait] ?? []) {
        const item = moduleItems.find((i) => i.id === id);
        if (!item) continue;
        pool.push({ itemId: id, text: item.text, trait });
      }
    }
    return pool;
  }, [data.step1Selections, moduleItems]);

  const startStep2 = () => {
    setData((d) => ({ ...d, step: "rank", finalSelections: [] }));
  };

  const toggleFinal = (item: PresentAuthoringItem) => {
    setData((d) => {
      const exists = d.finalSelections.some((s) => s.itemId === item.itemId);
      const next = exists
        ? d.finalSelections.filter((s) => s.itemId !== item.itemId)
        : d.finalSelections.length < 9
          ? [...d.finalSelections, item]
          : d.finalSelections;
      return { ...d, finalSelections: next };
    });
  };

  const setRank = (itemId: string, rank: number) => {
    setData((d) => ({
      ...d,
      finalSelections: d.finalSelections.map((s) =>
        s.itemId === itemId ? { ...s, rank } : s
      ),
    }));
  };

  const updateWriteField = (
    itemId: string,
    field: keyof PresentAuthoringItem,
    value: string
  ) => {
    setData((d) => ({
      ...d,
      finalSelections: d.finalSelections.map((s) =>
        s.itemId === itemId ? { ...s, [field]: value } : s
      ),
    }));
  };

  if (!loaded) return <p className="text-muted">Loading…</p>;

  if (data.step === "instructions") {
    return (
      <div className="space-y-6">
        <PageHeader title={meta.title} subtitle={meta.intro} />
        <Card>
          <div className="space-y-4">
            {TRAITS.map((t) => (
              <div key={t} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary">{TRAIT_LABELS[t]}</span>
                  <Badge variant="trait">{t}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {meta.pole === "fault"
                    ? "Traits that may have negatively impacted your life."
                    : "Positive aspects of this trait in your personality."}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Button className="w-full" onClick={() => setData((d) => ({ ...d, step: "select" }))}>
          Begin
        </Button>
      </div>
    );
  }

  if (data.step === "select") {
    const traitItems = itemsByTrait(traitTab);
    const selected = data.step1Selections[traitTab] ?? [];
    return (
      <div className="space-y-4">
        <PageHeader
          title="Step 1 — Select"
          subtitle={`Choose 2–10 items for ${TRAIT_LABELS[traitTab]}`}
          meta={`${selected.length} selected for this trait`}
        />
        <div className="flex gap-1 overflow-x-auto pb-2">
          {TRAITS.map((t) => (
            <button
              key={t}
              onClick={() => setTraitTab(t)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                traitTab === t
                  ? "bg-primary text-white"
                  : "bg-surface text-muted hover:bg-border"
              }`}
            >
              {TRAIT_LABELS[t]} ({data.step1Selections[t]?.length ?? 0})
            </button>
          ))}
        </div>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {traitItems.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${
                selected.includes(item.id)
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface-elevated hover:border-primary/20"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => toggleSelection(traitTab, item.id)}
                className="mt-1"
              />
              {item.text}
            </label>
          ))}
        </div>
        <Button
          className="w-full"
          disabled={!allStep1Valid}
          onClick={startStep2}
        >
          Continue to Step 2
        </Button>
      </div>
    );
  }

  if (data.step === "rank") {
    const count = data.finalSelections.length;
    const valid = count >= 6 && count <= 9;
    return (
      <div className="space-y-4">
        <PageHeader
          title="Step 2 — Rank & Select"
          subtitle="Select 6–9 most important items from your initial choices"
          meta={`${count} of 6–9 selected`}
        />
        <div className="max-h-[40vh] space-y-2 overflow-y-auto">
          {selectionPool.map((item) => {
            const isInFinal = data.finalSelections.find(
              (s) => s.itemId === item.itemId
            );
            return (
              <div
                key={item.itemId}
                className="rounded-xl border border-border bg-surface-elevated p-3"
              >
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!isInFinal}
                    onChange={() => toggleFinal(item)}
                  />
                  {item.text}
                </label>
                {isInFinal && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted">Rank:</span>
                    <input
                      type="number"
                      min={1}
                      max={count}
                      value={isInFinal.rank ?? ""}
                      onChange={(e) =>
                        setRank(item.itemId, Number(e.target.value))
                      }
                      className="w-16 rounded-lg border border-border bg-surface-elevated px-2 py-1 text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => {
            setWriteIndex(0);
            setData((d) => ({ ...d, step: "write" }));
          }}
        >
          Start Writing
        </Button>
      </div>
    );
  }

  if (data.step === "write") {
    const sorted = [...data.finalSelections].sort(
      (a, b) => (a.rank ?? 99) - (b.rank ?? 99)
    );
    const item = sorted[writeIndex];
    if (!item) return <p className="text-muted">Loading…</p>;
    const prompts =
      module === "faults"
        ? {
            past: "How has this fault impacted you negatively in the past?",
            diff: "What might you have done differently?",
            rectify: "What could you do now and in the future to rectify or eliminate this fault?",
          }
        : {
            past: "How has this virtue positively impacted your life?",
            diff: "When have you failed to live up to this virtue?",
            rectify: "How can you cultivate this virtue more in the future?",
          };

    return (
      <div className="space-y-4">
        <PageHeader
          title={`Writing ${writeIndex + 1} of ${sorted.length}`}
          subtitle={item.text}
        />
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-primary">{prompts.past}</span>
            <textarea
              value={item.negativePastImpact ?? ""}
              onChange={(e) =>
                updateWriteField(item.itemId, "negativePastImpact", e.target.value)
              }
              rows={4}
              className="textarea-field mt-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-primary">{prompts.diff}</span>
            <textarea
              value={item.couldHaveDoneDifferently ?? ""}
              onChange={(e) =>
                updateWriteField(
                  item.itemId,
                  "couldHaveDoneDifferently",
                  e.target.value
                )
              }
              rows={4}
              className="textarea-field mt-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-primary">{prompts.rectify}</span>
            <textarea
              value={item.rectifyNowFuture ?? ""}
              onChange={(e) =>
                updateWriteField(item.itemId, "rectifyNowFuture", e.target.value)
              }
              rows={4}
              className="textarea-field mt-2"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={writeIndex === 0}
            onClick={() => setWriteIndex((i) => i - 1)}
          >
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (writeIndex < sorted.length - 1) setWriteIndex((i) => i + 1);
              else setData((d) => ({ ...d, step: "conclusion" }));
            }}
          >
            {writeIndex < sorted.length - 1 ? "Next" : "Finish"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complete"
        subtitle={`You have finished the ${module} analysis. Your responses are saved.`}
      />
      <ExportButtons
        onExportMd={() => exportModule(module, data, "md")}
        onExportTxt={() => exportModule(module, data, "txt")}
      />
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setData(defaultData())}
      >
        Start Over
      </Button>
    </div>
  );
}
