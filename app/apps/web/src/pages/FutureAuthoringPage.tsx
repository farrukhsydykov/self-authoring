import { useEffect, useState } from "react";
import type { FutureAuthoringData, FutureGoal } from "@self-authoring/shared";
import { FUTURE_IMAGINATION_PROMPTS } from "@self-authoring/shared";
import { api } from "../lib/api";
import { useAutosave } from "../lib/useAutosave";
import { exportModule } from "../lib/export";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { ExportButtons } from "../components/ExportButtons";

const defaultPrompts = (): Record<string, string> =>
  Object.fromEntries(FUTURE_IMAGINATION_PROMPTS.map((p) => [p, ""]));

const defaultData = (): FutureAuthoringData => ({
  step: "instructions",
  imaginationPrompts: defaultPrompts(),
  idealFutureWrite: "",
  futureToAvoid: "",
  themeTitle: "",
  goals: [{ title: "", strategy: "", futureSteps: "" }],
});

const TIMER_SECONDS = 15 * 60;

/** Future authoring — Stage 1 imagination + Stage 2 goals. */
export function FutureAuthoringPage() {
  const [data, setData] = useState<FutureAuthoringData>(defaultData);
  const [loaded, setLoaded] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [goalIndex, setGoalIndex] = useState(0);

  useAutosave("future", data, loaded);

  useEffect(() => {
    api<{ document: { data: FutureAuthoringData } | null }>("/authoring/future")
      .then((r) => {
        if (r.document?.data) setData(r.document.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const updatePrompt = (prompt: string, value: string) => {
    setData((d) => ({
      ...d,
      imaginationPrompts: { ...d.imaginationPrompts, [prompt]: value },
    }));
  };

  const updateGoal = (index: number, field: keyof FutureGoal, value: string) => {
    setData((d) => ({
      ...d,
      goals: d.goals.map((g, i) => (i === index ? { ...g, [field]: value } : g)),
    }));
  };

  const addGoal = () => {
    if (data.goals.length >= 8) return;
    setData((d) => ({
      ...d,
      goals: [...d.goals, { title: "", strategy: "", futureSteps: "" }],
    }));
  };

  if (!loaded) return <p className="text-muted">Loading…</p>;

  if (data.step === "instructions") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Future Authoring"
          subtitle="Stage 1: Imagine your ideal future through guided prompts and a 15-minute free-write. Stage 2: Define goals and strategies to make that future real."
        />
        <Button className="w-full" onClick={() => setData((d) => ({ ...d, step: "stage1" }))}>
          Begin Stage 1
        </Button>
      </div>
    );
  }

  if (data.step === "stage1") {
    const prompts = FUTURE_IMAGINATION_PROMPTS;
    const onPrompts = promptIndex < prompts.length;

    if (onPrompts) {
      const prompt = prompts[promptIndex];
      return (
        <div className="space-y-4">
          <PageHeader
            title="Stage 1 — Imagination"
            subtitle={prompt}
            meta={`Prompt ${promptIndex + 1} of ${prompts.length}`}
          />
          <textarea
            value={data.imaginationPrompts[prompt] ?? ""}
            onChange={(e) => updatePrompt(prompt, e.target.value)}
            rows={6}
            className="textarea-field"
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={promptIndex === 0}
              onClick={() => setPromptIndex((i) => i - 1)}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => setPromptIndex((i) => i + 1)}
            >
              {promptIndex < prompts.length - 1 ? "Next" : "Free Write"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <PageHeader
          title="Ideal Future — Free Write"
          subtitle="Write for 15 minutes about your ideal future."
          meta={`Timer: ${formatTime(secondsLeft)}`}
        />
        {!timerRunning && secondsLeft === TIMER_SECONDS && (
          <Button className="w-full" onClick={() => setTimerRunning(true)}>
            Start 15-Minute Timer
          </Button>
        )}
        <textarea
          value={data.idealFutureWrite}
          onChange={(e) => setData((d) => ({ ...d, idealFutureWrite: e.target.value }))}
          rows={10}
          placeholder="Describe your ideal future in detail…"
          className="textarea-field"
        />
        <label className="block text-sm">
          <span className="font-medium text-primary">Future to Avoid</span>
          <textarea
            value={data.futureToAvoid}
            onChange={(e) => setData((d) => ({ ...d, futureToAvoid: e.target.value }))}
            rows={4}
            placeholder="Describe a future you want to avoid…"
            className="textarea-field mt-2"
          />
        </label>
        <Button className="w-full" onClick={() => setData((d) => ({ ...d, step: "stage2" }))}>
          Continue to Stage 2
        </Button>
      </div>
    );
  }

  if (data.step === "stage2") {
    const goal = data.goals[goalIndex];
    return (
      <div className="space-y-4">
        <PageHeader
          title="Stage 2 — Goals"
          subtitle={`Goal ${goalIndex + 1} of ${data.goals.length}`}
        />
        {goalIndex === 0 && (
          <label className="block text-sm">
            <span className="font-medium text-primary">Theme / Title for your future</span>
            <input
              value={data.themeTitle}
              onChange={(e) => setData((d) => ({ ...d, themeTitle: e.target.value }))}
              className="input-field mt-2"
            />
          </label>
        )}
        <input
          placeholder="Goal title"
          value={goal.title}
          onChange={(e) => updateGoal(goalIndex, "title", e.target.value)}
          className="input-field"
        />
        <textarea
          placeholder="How will you achieve this goal?"
          value={goal.strategy}
          onChange={(e) => updateGoal(goalIndex, "strategy", e.target.value)}
          rows={4}
          className="textarea-field"
        />
        <textarea
          placeholder="Specific steps for the future"
          value={goal.futureSteps}
          onChange={(e) => updateGoal(goalIndex, "futureSteps", e.target.value)}
          rows={4}
          className="textarea-field"
        />
        {data.goals.length < 8 && goalIndex === data.goals.length - 1 && (
          <Button variant="secondary" className="w-full" onClick={addGoal}>
            Add Another Goal
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={goalIndex === 0}
            onClick={() => setGoalIndex((i) => i - 1)}
          >
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (goalIndex < data.goals.length - 1) setGoalIndex((i) => i + 1);
              else setData((d) => ({ ...d, step: "complete" }));
            }}
          >
            {goalIndex < data.goals.length - 1 ? "Next Goal" : "Finish"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Future Authoring — Complete" subtitle="Your future plan is saved." />
      <ExportButtons
        onExportMd={() => exportModule("future", data, "md")}
        onExportTxt={() => exportModule("future", data, "txt")}
      />
      <Button variant="secondary" className="w-full" onClick={() => setData(defaultData())}>
        Start Over
      </Button>
    </div>
  );
}
