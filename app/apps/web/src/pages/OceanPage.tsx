import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LikertAnswer, OceanItem, Trait } from "@self-authoring/shared";
import { TRAIT_LABELS } from "@self-authoring/shared";
import oceanItems from "@self-authoring/shared/ocean-items.json";
import { useOceanStore } from "../stores";
import { api } from "../lib/api";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ProgressBar } from "../components/ProgressBar";

const LIKERT_LABELS = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree",
];

const items = oceanItems as OceanItem[];

/** Returns true when every inventory item has a valid Likert answer. */
function allItemsAnswered(answers: Record<string, LikertAnswer | string | number>) {
  return items.every((item) => {
    const value = Number(answers[item.id]);
    return Number.isInteger(value) && value >= 1 && value <= 5;
  });
}

/** Normalizes stored answers to numeric Likert values for submission. */
function normalizeAnswers(
  answers: Record<string, LikertAnswer | string | number>
): Record<string, LikertAnswer> {
  const normalized: Record<string, LikertAnswer> = {};
  for (const item of items) {
    const value = Number(answers[item.id]);
    if (Number.isInteger(value) && value >= 1 && value <= 5) {
      normalized[item.id] = value as LikertAnswer;
    }
  }
  return normalized;
}

/** OCEAN assessment — one item per screen with resume support. */
export function OceanPage() {
  const navigate = useNavigate();
  const { draft, setAnswer, setIndex, resetDraft } = useOceanStore();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const current = items[draft.currentIndex];
  const answered = Object.keys(draft.answers).length;

  useEffect(() => {
    if (draft.currentIndex >= items.length && items.length > 0) {
      setIndex(items.length - 1);
    }
  }, [draft.currentIndex, setIndex]);

  const handleAnswer = (value: LikertAnswer) => {
    if (!current) return;
    setAnswer(current.id, value);
    if (draft.currentIndex < items.length - 1) {
      setIndex(draft.currentIndex + 1);
    }
  };

  const handleSubmit = async () => {
    const answers = normalizeAnswers(useOceanStore.getState().draft.answers);
    if (!allItemsAnswered(answers)) {
      setSubmitError("Please answer every item before viewing results.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await api<{ id: string }>("/ocean", {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      if (!result.id) throw new Error("Server did not return a result id.");
      navigate(`/ocean/results/${result.id}`);
      resetDraft();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!current) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted">Loading assessment…</p>
      </div>
    );
  }

  const isComplete = allItemsAnswered(draft.answers);
  const currentAnswer = draft.answers[current.id];
  const traitLabel = TRAIT_LABELS[current.trait as Trait];

  return (
    <div className="space-y-6">
      <PageHeader
        title="OCEAN Assessment"
        subtitle="Rate how accurately each statement describes you. There are no right or wrong answers."
        meta={`Item ${draft.currentIndex + 1} of ${items.length} · ${answered} answered`}
      />

      <ProgressBar value={answered} max={items.length} label="Progress" showCounts />

      {!isComplete ? (
        <>
          <Card className="relative overflow-hidden">
            <div className="absolute right-4 top-4 flex gap-2">
              <Badge variant="trait">{traitLabel}</Badge>
              <Badge variant={current.pole === "virtue" ? "success" : "warning"}>
                {current.pole}
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
              disabled={draft.currentIndex === 0}
              onClick={() => setIndex(draft.currentIndex - 1)}
            >
              Back
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={!currentAnswer}
              onClick={() => setIndex(Math.min(draft.currentIndex + 1, items.length - 1))}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <Card className="text-center">
          <p className="font-display text-xl font-semibold text-primary">Assessment complete</p>
          <p className="mt-2 text-sm text-muted">
            All {items.length} items answered. Submit to compute your Big Five profile.
          </p>
          {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}
          <Button className="mt-6 w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Computing scores…" : "View Results"}
          </Button>
        </Card>
      )}
    </div>
  );
}
