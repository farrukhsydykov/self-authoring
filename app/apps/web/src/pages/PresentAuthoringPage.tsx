import { useEffect, useMemo, useState } from "react";
import type {
  LikertAnswer,
  OceanItem,
  PresentAuthoringData,
  PresentAuthoringItem,
  PresentAuthoringOverview,
  PresentAuthoringPartData,
  PresentPartKey,
  Trait,
} from "@self-authoring/shared";
import oceanItems from "@self-authoring/shared/ocean-items.json";
import {
  getPresentPartProgress,
  isNarrowSelectionValid,
  canStartNarrow,
} from "../lib/present-progress";
import { loadPresentDocument, updatePresentPart } from "../lib/present";
import { api } from "../lib/api";
import { exportModule } from "../lib/export";
import {
  PRESENT_FAULT_PROMPTS,
  PRESENT_FINAL_MAX,
  PRESENT_FINAL_MIN,
  PRESENT_VIRTUE_PROMPTS,
  TRAITS,
  TRAIT_LABELS,
  isPresentProgrammeComplete,
  isReflectionComplete,
  poleForPart,
} from "@self-authoring/shared";
import { useAutosave } from "../lib/useAutosave";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ExportButtons } from "../components/ExportButtons";
import { ExpandableTextarea } from "../components/ExpandableTextarea";
import { ProgressBar } from "../components/ProgressBar";
import { ProgressRing } from "../components/ProgressRing";

const LIKERT_LABELS = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree",
];

const items = oceanItems as OceanItem[];
const faultItems = items.filter((i) => i.pole === "fault");
const virtueItems = items.filter((i) => i.pole === "virtue");
const faultIds = faultItems.map((i) => i.id);
const virtueIds = virtueItems.map((i) => i.id);

const PART_META: Record<
  PresentPartKey,
  { title: string; intro: string; assessmentIntro: string }
> = {
  faults: {
    title: "Faults",
    intro:
      "Complete the 150-item assessment, then narrow to your 2–7 most impactful faults (most to least). Write about each one.",
    assessmentIntro:
      "Rate how accurately each fault statement describes you. All 150 answers are required before narrowing.",
  },
  virtues: {
    title: "Virtues",
    intro:
      "Complete the 150-item assessment, then narrow to your 2–7 most meaningful virtues (most to least). Write about each one.",
    assessmentIntro:
      "Rate how accurately each virtue statement describes you. All 150 answers are required before narrowing.",
  },
};

function itemsForPart(part: PresentPartKey): OceanItem[] {
  return part === "faults" ? faultItems : virtueItems;
}

function itemIdsForPart(part: PresentPartKey): string[] {
  return part === "faults" ? faultIds : virtueIds;
}

/** Present Authoring programme with Faults and Virtues parts. */
export function PresentAuthoringPage() {
  const [data, setData] = useState<PresentAuthoringData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<"home" | "part">("home");
  const [overview, setOverview] = useState<PresentAuthoringOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");

  const { save, status: saveStatus } = useAutosave("present", data, loaded && !!data);

  useEffect(() => {
    loadPresentDocument()
      .then((doc) => {
        setData(doc);
        setOverview(doc.overview ?? null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const activePart = data?.activePart ?? "faults";
  const partData = data?.[activePart];

  const partProgress = useMemo(() => {
    if (!data) return null;
    return {
      faults: getPresentPartProgress(data.faults, "faults", faultIds.length, faultIds),
      virtues: getPresentPartProgress(data.virtues, "virtues", virtueIds.length, virtueIds),
    };
  }, [data]);

  const programmeComplete = data
    ? isPresentProgrammeComplete(data, faultIds, virtueIds)
    : false;

  const patchPart = (part: PresentPartKey, patch: Partial<PresentAuthoringPartData>) => {
    setData((current) => (current ? updatePresentPart(current, part, patch) : current));
  };

  const setActivePart = (part: PresentPartKey) => {
    setData((current) => (current ? { ...current, activePart: part } : current));
    setView("part");
  };

  const goHome = () => setView("home");

  const handleGenerateOverview = async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const result = await api<{ overview: PresentAuthoringOverview }>(
        "/authoring/present/overview",
        { method: "POST" }
      );
      setOverview(result.overview);
      setData((current) => (current ? { ...current, overview: result.overview } : current));
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : "Failed to generate overview.");
    } finally {
      setOverviewLoading(false);
    }
  };

  if (!loaded || !data) {
    return <p className="text-muted">Loading…</p>;
  }

  if (view === "home") {
    return (
      <ProgrammeHome
        data={data}
        partProgress={partProgress!}
        programmeComplete={programmeComplete}
        overview={overview}
        overviewLoading={overviewLoading}
        overviewError={overviewError}
        saveStatus={saveStatus}
        onStartPart={setActivePart}
        onGenerateOverview={handleGenerateOverview}
        onExport={() => exportModule("present", data, "md")}
      />
    );
  }

  if (!partData) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={goHome}>
          Back to programme
        </Button>
        <SaveStatusBadge status={saveStatus} />
      </div>

      {partData.step === "instructions" && (
        <PartInstructions
          part={activePart}
          onBegin={() => patchPart(activePart, { step: "assessment" })}
        />
      )}

      {partData.step === "assessment" && (
        <PartAssessment
          part={activePart}
          partData={partData}
          onChange={(patch) => patchPart(activePart, patch)}
          onComplete={() => patchPart(activePart, { step: "narrow" })}
        />
      )}

      {partData.step === "narrow" && (
        <PartNarrow
          part={activePart}
          partData={partData}
          onChange={(patch) => patchPart(activePart, patch)}
          onContinue={() => {
            void save();
            patchPart(activePart, { step: "write", writeIndex: 0 });
          }}
        />
      )}

      {partData.step === "write" && (
        <PartWrite
          part={activePart}
          partData={partData}
          onChange={(patch) => patchPart(activePart, patch)}
          onComplete={() => {
            void save();
            patchPart(activePart, { step: "complete" });
            goHome();
          }}
        />
      )}

      {partData.step === "complete" && (
        <PartComplete part={activePart} onHome={goHome} />
      )}
    </div>
  );
}

function SaveStatusBadge({ status }: { status: string }) {
  if (status === "idle") return null;
  const label =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Save failed"
          : "";
  return (
    <span
      className={`text-xs ${status === "error" ? "text-red-600" : "text-muted"}`}
    >
      {label}
    </span>
  );
}

function ProgrammeHome({
  data,
  partProgress,
  programmeComplete,
  overview,
  overviewLoading,
  overviewError,
  saveStatus,
  onStartPart,
  onGenerateOverview,
  onExport,
}: {
  data: PresentAuthoringData;
  partProgress: Record<PresentPartKey, ReturnType<typeof getPresentPartProgress>>;
  programmeComplete: boolean;
  overview: PresentAuthoringOverview | null;
  overviewLoading: boolean;
  overviewError: string;
  saveStatus: string;
  onStartPart: (part: PresentPartKey) => void;
  onGenerateOverview: () => void;
  onExport: () => void;
}) {
  const parts: PresentPartKey[] = ["faults", "virtues"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Present Authoring"
        subtitle="Understand your personality faults and virtues through assessment, narrowing, and written reflection."
      />
      <SaveStatusBadge status={saveStatus} />

      <div className="grid gap-4 sm:grid-cols-2">
        {parts.map((part) => {
          const progress = partProgress[part];
          const meta = PART_META[part];
          return (
            <Card key={part} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-primary">{meta.title}</h2>
                  <p className="mt-1 text-sm text-muted">{meta.intro}</p>
                </div>
                <ProgressRing percent={progress.percent} size={48} strokeWidth={3} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Badge
                  variant={
                    progress.status === "complete"
                      ? "success"
                      : progress.status === "in_progress"
                        ? "warning"
                        : "default"
                  }
                >
                  {progress.stepLabel}
                </Badge>
                {progress.detail && <span>{progress.detail}</span>}
              </div>
              <Button className="mt-4 w-full" onClick={() => onStartPart(part)}>
                {progress.status === "complete" ? "Review" : "Continue"}
              </Button>
            </Card>
          );
        })}
      </div>

      {programmeComplete && (
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-primary">AI Overview</h2>
          <p className="text-sm text-muted">
            Generate a synthesis of your Faults and Virtues assessments and reflections.
          </p>
          {overview ? (
            <OverviewDisplay overview={overview} />
          ) : (
            <>
              {overviewError && <p className="text-sm text-red-600">{overviewError}</p>}
              <Button onClick={onGenerateOverview} disabled={overviewLoading}>
                {overviewLoading ? "Generating…" : "Generate AI Overview"}
              </Button>
            </>
          )}
        </Card>
      )}

      {programmeComplete && (
        <ExportButtons onExportMd={onExport} onExportTxt={() => exportModule("present", data, "txt")} />
      )}
    </div>
  );
}

function OverviewDisplay({ overview }: { overview: PresentAuthoringOverview }) {
  return (
    <div className="space-y-4 text-sm">
      <p>{overview.summary}</p>
      <div>
        <h3 className="font-semibold text-primary">Fault patterns</h3>
        <ul className="mt-1 list-disc pl-5 text-muted">
          {overview.faultPatterns.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold text-primary">Virtue strengths</h3>
        <ul className="mt-1 list-disc pl-5 text-muted">
          {overview.virtueStrengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold text-primary">Growth areas</h3>
        <ul className="mt-1 list-disc pl-5 text-muted">
          {overview.growthAreas.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold text-primary">Recommendations</h3>
        <ul className="mt-1 list-disc pl-5 text-muted">
          {overview.actionableRecommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PartInstructions({
  part,
  onBegin,
}: {
  part: PresentPartKey;
  onBegin: () => void;
}) {
  const meta = PART_META[part];
  return (
    <div className="space-y-6">
      <PageHeader title={`Present Authoring — ${meta.title}`} subtitle={meta.intro} />
      <Card>
        <div className="space-y-4">
          {TRAITS.map((t) => (
            <div key={t} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">{TRAIT_LABELS[t]}</span>
                <Badge variant="trait">{t}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {part === "faults"
                  ? "Negative traits that may have impacted your life."
                  : "Positive traits that shape who you are."}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <Button className="w-full" onClick={onBegin}>
        Begin {meta.title} assessment
      </Button>
    </div>
  );
}

function PartAssessment({
  part,
  partData,
  onChange,
  onComplete,
}: {
  part: PresentPartKey;
  partData: PresentAuthoringPartData;
  onChange: (patch: Partial<PresentAuthoringPartData>) => void;
  onComplete: () => void;
}) {
  const partItems = itemsForPart(part);
  const ids = itemIdsForPart(part);
  const index = Math.min(partData.assessmentIndex, partItems.length - 1);
  const current = partItems[index];
  const answered = countAnswers(partData.assessmentAnswers, ids);
  const complete = canStartNarrow(partData, ids);

  const handleAnswer = (value: LikertAnswer) => {
    if (!current) return;
    const nextAnswers = { ...partData.assessmentAnswers, [current.id]: value };
    const nextIndex =
      partData.assessmentIndex < partItems.length - 1
        ? partData.assessmentIndex + 1
        : partData.assessmentIndex;
    onChange({ assessmentAnswers: nextAnswers, assessmentIndex: nextIndex });
  };

  if (!current) return null;

  const currentAnswer = partData.assessmentAnswers[current.id];
  const meta = PART_META[part];

  if (complete) {
    return (
      <div className="space-y-6">
        <PageHeader title={`${meta.title} assessment complete`} subtitle={meta.assessmentIntro} />
        <Card className="text-center">
          <p className="font-display text-xl font-semibold text-primary">All 150 items answered</p>
          <p className="mt-2 text-sm text-muted">Continue to narrow your most impactful traits.</p>
          <Button className="mt-6 w-full" onClick={onComplete}>
            Continue to narrowing
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${meta.title} assessment`}
        subtitle={meta.assessmentIntro}
        meta={`Item ${index + 1} of ${partItems.length} · ${answered} answered`}
      />
      <ProgressBar value={answered} max={partItems.length} label="Progress" showCounts />
      <Card className="relative overflow-hidden">
        <div className="absolute right-4 top-4 flex gap-2">
          <Badge variant="trait">{TRAIT_LABELS[current.trait]}</Badge>
          <Badge variant={poleForPart(part) === "virtue" ? "success" : "warning"}>
            {poleForPart(part)}
          </Badge>
        </div>
        <p className="pr-32 text-lg leading-relaxed text-slate-800">{current.text}</p>
      </Card>
      <div className="space-y-2">
        {([1, 2, 3, 4, 5] as LikertAnswer[]).map((v) => (
          <button
            key={v}
            onClick={() => handleAnswer(v)}
            className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm transition ${
              currentAnswer === v
                ? "border-primary bg-primary/8 font-semibold text-primary shadow-sm"
                : "border-border bg-surface-elevated hover:border-primary/30 hover:bg-surface"
            }`}
          >
            <span className="mr-2 tabular-nums text-muted">{v}.</span>
            {LIKERT_LABELS[v - 1]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={index === 0}
          onClick={() => onChange({ assessmentIndex: index - 1 })}
        >
          Back
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          disabled={!currentAnswer}
          onClick={() => onChange({ assessmentIndex: Math.min(index + 1, partItems.length - 1) })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function countAnswers(answers: Record<string, LikertAnswer>, ids: string[]): number {
  return ids.filter((id) => {
    const value = Number(answers[id]);
    return Number.isInteger(value) && value >= 1 && value <= 5;
  }).length;
}

function PartNarrow({
  part,
  partData,
  onChange,
  onContinue,
}: {
  part: PresentPartKey;
  partData: PresentAuthoringPartData;
  onChange: (patch: Partial<PresentAuthoringPartData>) => void;
  onContinue: () => void;
}) {
  const partItems = itemsForPart(part);
  const selected = partData.finalSelections;
  const valid = isNarrowSelectionValid(selected);
  const meta = PART_META[part];
  const [expandedTraits, setExpandedTraits] = useState<Set<Trait>>(() => new Set(TRAITS));

  const toggleTrait = (trait: Trait) => {
    setExpandedTraits((prev) => {
      const next = new Set(prev);
      if (next.has(trait)) next.delete(trait);
      else next.add(trait);
      return next;
    });
  };

  const expandAllTraits = () => setExpandedTraits(new Set(TRAITS));
  const collapseAllTraits = () => setExpandedTraits(new Set());

  const toggleItem = (item: OceanItem) => {
    const exists = selected.find((s) => s.itemId === item.id);
    if (exists) {
      const next = selected
        .filter((s) => s.itemId !== item.id)
        .map((s, index) => ({ ...s, order: index + 1 }));
      onChange({ finalSelections: next });
      return;
    }
    if (selected.length >= PRESENT_FINAL_MAX) return;
    onChange({
      finalSelections: [
        ...selected,
        {
          itemId: item.id,
          text: item.text,
          trait: item.trait,
          order: selected.length + 1,
          reflection: { example: "", lesson: "" },
        },
      ],
    });
  };

  const moveItem = (itemId: string, direction: -1 | 1) => {
    const sorted = [...selected].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((s) => s.itemId === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sorted.length) return;
    [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
    onChange({
      finalSelections: sorted.map((item, i) => ({ ...item, order: i + 1 })),
    });
  };

  const sortedSelected = [...selected].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Narrow your ${meta.title.toLowerCase()}`}
        subtitle={`Select ${PRESENT_FINAL_MIN}–${PRESENT_FINAL_MAX} traits that affect you most. Order them from most impactful (1) to least.`}
        meta={`${selected.length} selected`}
      />
      {sortedSelected.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-primary">Your ordered selection</h3>
          <div className="mt-3 space-y-2">
            {sortedSelected.map((item) => (
              <div
                key={item.itemId}
                className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"
              >
                <Badge variant="accent">{item.order}</Badge>
                <span className="flex-1">{item.text}</span>
                <Button variant="secondary" onClick={() => moveItem(item.itemId, -1)}>
                  ↑
                </Button>
                <Button variant="secondary" onClick={() => moveItem(item.itemId, 1)}>
                  ↓
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={expandAllTraits}>
          Expand all
        </Button>
        <Button variant="secondary" className="flex-1" onClick={collapseAllTraits}>
          Collapse all
        </Button>
      </div>
      <div className="space-y-4">
        {TRAITS.map((trait) => {
          const traitItems = partItems.filter((i) => i.trait === trait);
          const selectedInTrait = traitItems.filter((i) =>
            selected.some((s) => s.itemId === i.id)
          ).length;
          const isExpanded = expandedTraits.has(trait);

          return (
            <Card key={trait}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-semibold text-primary">
                      {TRAIT_LABELS[trait]}
                    </h3>
                    <Badge variant="trait">{trait}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {selectedInTrait > 0
                      ? `${selectedInTrait} selected in this dimension`
                      : "Select traits that apply to you"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="shrink-0 !px-2 !py-1 text-xs"
                  onClick={() => toggleTrait(trait)}
                >
                  {isExpanded ? "Collapse" : "Expand"}
                </Button>
              </div>
              {isExpanded && (
                <div className="mt-4 space-y-2">
                  {traitItems.map((item) => {
                    const isSelected = selected.some((s) => s.itemId === item.id);
                    return (
                      <label
                        key={item.id}
                        className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-surface hover:border-primary/20"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(item)}
                          className="mt-1"
                        />
                        {item.text}
                      </label>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Button className="w-full" disabled={!valid} onClick={onContinue}>
        Start writing
      </Button>
    </div>
  );
}

type WriteField = "example" | "lesson" | "betterOutcome";

function WriteFieldSection({
  label,
  value,
  expanded,
  onExpandedChange,
  onChange,
}: {
  label: string;
  value: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-primary">{label}</span>
        <Button
          variant="ghost"
          type="button"
          className="shrink-0 !px-2 !py-1 text-xs"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onExpandedChange(!expanded)}
        >
          {expanded ? "Collapse" : "Expand"}
        </Button>
      </div>
      <ExpandableTextarea
        value={value}
        onChange={onChange}
        expanded={expanded}
        onExpandedChange={onExpandedChange}
      />
    </div>
  );
}

function PartWrite({
  part,
  partData,
  onChange,
  onComplete,
}: {
  part: PresentPartKey;
  partData: PresentAuthoringPartData;
  onChange: (patch: Partial<PresentAuthoringPartData>) => void;
  onComplete: () => void;
}) {
  const [expandedFields, setExpandedFields] = useState<Record<WriteField, boolean>>({
    example: false,
    lesson: false,
    betterOutcome: false,
  });
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);
  const sorted = [...partData.finalSelections].sort((a, b) => a.order - b.order);
  const writeIndex = Math.min(partData.writeIndex, Math.max(sorted.length - 1, 0));
  const item = sorted[writeIndex];
  const prompts = part === "faults" ? PRESENT_FAULT_PROMPTS : PRESENT_VIRTUE_PROMPTS;

  useEffect(() => {
    setExpandedFields({ example: false, lesson: false, betterOutcome: false });
    setExpandAll(undefined);
  }, [item?.itemId]);

  if (!item) return null;

  const isFieldExpanded = (field: WriteField) =>
    expandAll !== undefined ? expandAll : expandedFields[field];

  const handleFieldExpandChange = (field: WriteField, value: boolean) => {
    setExpandAll(undefined);
    setExpandedFields((prev) => ({ ...prev, [field]: value }));
  };

  const updateReflection = (field: keyof PresentAuthoringItem["reflection"], value: string) => {
    onChange({
      finalSelections: partData.finalSelections.map((s) =>
        s.itemId === item.itemId
          ? { ...s, reflection: { ...s.reflection, [field]: value } }
          : s
      ),
    });
  };

  const canAdvance = isReflectionComplete(item, part);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Writing ${writeIndex + 1} of ${sorted.length}`}
        subtitle={`#${item.order} — ${item.text}`}
      />
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setExpandAll(true)}>
          Expand all
        </Button>
        <Button variant="secondary" className="flex-1" onClick={() => setExpandAll(false)}>
          Collapse all
        </Button>
      </div>
      <WriteFieldSection
        label={prompts.example}
        value={item.reflection.example}
        expanded={isFieldExpanded("example")}
        onExpandedChange={(value) => handleFieldExpandChange("example", value)}
        onChange={(value) => updateReflection("example", value)}
      />
      <WriteFieldSection
        label={prompts.lesson}
        value={item.reflection.lesson}
        expanded={isFieldExpanded("lesson")}
        onExpandedChange={(value) => handleFieldExpandChange("lesson", value)}
        onChange={(value) => updateReflection("lesson", value)}
      />
      {part === "faults" && (
        <WriteFieldSection
          label={PRESENT_FAULT_PROMPTS.betterOutcome}
          value={item.reflection.betterOutcome ?? ""}
          expanded={isFieldExpanded("betterOutcome")}
          onExpandedChange={(value) => handleFieldExpandChange("betterOutcome", value)}
          onChange={(value) => updateReflection("betterOutcome", value)}
        />
      )}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={writeIndex === 0}
          onClick={() => onChange({ writeIndex: writeIndex - 1 })}
        >
          Back
        </Button>
        <Button
          className="flex-1"
          disabled={!canAdvance}
          onClick={() => {
            if (writeIndex < sorted.length - 1) {
              onChange({ writeIndex: writeIndex + 1 });
            } else {
              onComplete();
            }
          }}
        >
          {writeIndex < sorted.length - 1 ? "Next" : "Finish part"}
        </Button>
      </div>
    </div>
  );
}

function PartComplete({ part, onHome }: { part: PresentPartKey; onHome: () => void }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${PART_META[part].title} complete`}
        subtitle="Your responses are saved. Continue with the other part or generate your overview when both are done."
      />
      <Button className="w-full" onClick={onHome}>
        Back to programme
      </Button>
    </div>
  );
}
