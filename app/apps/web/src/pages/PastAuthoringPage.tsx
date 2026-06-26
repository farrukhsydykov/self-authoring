import { useEffect, useState } from "react";
import type { PastAuthoringData, PastEpoch } from "@self-authoring/shared";
import { DEFAULT_PAST_EPOCHS } from "@self-authoring/shared";
import { api } from "../lib/api";
import { useAutosave } from "../lib/useAutosave";
import { exportModule } from "../lib/export";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ExportButtons } from "../components/ExportButtons";

const defaultData = (): PastAuthoringData => ({
  step: "intro",
  epochs: DEFAULT_PAST_EPOCHS.map((label) => ({
    label,
    experiences: [{ title: "", howItShapedMe: "" }],
  })),
});

/** Past authoring — seven epochs with experiences. */
export function PastAuthoringPage() {
  const [data, setData] = useState<PastAuthoringData>(defaultData);
  const [epochIndex, setEpochIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useAutosave("past", data, loaded);

  useEffect(() => {
    api<{ document: { data: PastAuthoringData } | null }>("/authoring/past")
      .then((r) => {
        if (r.document?.data) setData(r.document.data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const updateEpochLabel = (index: number, label: string) => {
    setData((d) => ({
      ...d,
      epochs: d.epochs.map((e, i) => (i === index ? { ...e, label } : e)),
    }));
  };

  const updateExperience = (
    epochIdx: number,
    expIdx: number,
    field: "title" | "howItShapedMe",
    value: string
  ) => {
    setData((d) => ({
      ...d,
      epochs: d.epochs.map((e, i) =>
        i === epochIdx
          ? {
              ...e,
              experiences: e.experiences.map((exp, j) =>
                j === expIdx ? { ...exp, [field]: value } : exp
              ),
            }
          : e
      ),
    }));
  };

  const addExperience = (epochIdx: number) => {
    setData((d) => ({
      ...d,
      epochs: d.epochs.map((e, i) =>
        i === epochIdx && e.experiences.length < 6
          ? { ...e, experiences: [...e.experiences, { title: "", howItShapedMe: "" }] }
          : e
      ),
    }));
  };

  if (!loaded) return <p className="text-muted">Loading…</p>;

  if (data.step === "intro") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Past Authoring"
          subtitle="Divide your life into seven epochs. For each epoch, describe up to six significant experiences and how they shaped who you are today."
        />
        <Button className="w-full" onClick={() => setData((d) => ({ ...d, step: "epochs" }))}>
          Begin
        </Button>
      </div>
    );
  }

  if (data.step === "epochs") {
    const epoch = data.epochs[epochIndex];
    return (
      <div className="space-y-4">
        <PageHeader
          title={`Epoch ${epochIndex + 1} of ${data.epochs.length}`}
          subtitle={epoch.label}
        />
        <label className="block text-sm">
          <span className="font-medium text-primary">Epoch name</span>
          <input
            value={epoch.label}
            onChange={(e) => updateEpochLabel(epochIndex, e.target.value)}
            className="input-field mt-2"
          />
        </label>
        {epoch.experiences.map((exp, expIdx) => (
          <Card key={expIdx} padding="sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Experience {expIdx + 1}
            </p>
            <input
              placeholder="Title"
              value={exp.title}
              onChange={(e) =>
                updateExperience(epochIndex, expIdx, "title", e.target.value)
              }
              className="input-field mt-2"
            />
            <textarea
              placeholder="How did this experience shape you?"
              value={exp.howItShapedMe}
              onChange={(e) =>
                updateExperience(epochIndex, expIdx, "howItShapedMe", e.target.value)
              }
              rows={4}
              className="textarea-field mt-2"
            />
          </Card>
        ))}
        {epoch.experiences.length < 6 && (
          <Button variant="secondary" className="w-full" onClick={() => addExperience(epochIndex)}>
            Add Experience
          </Button>
        )}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={epochIndex === 0}
            onClick={() => setEpochIndex((i) => i - 1)}
          >
            Previous Epoch
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (epochIndex < data.epochs.length - 1) setEpochIndex((i) => i + 1);
              else setData((d) => ({ ...d, step: "summary" }));
            }}
          >
            {epochIndex < data.epochs.length - 1 ? "Next Epoch" : "Summary"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Past Authoring — Summary" subtitle="Review your life epochs and experiences." />
      {data.epochs.map((epoch: PastEpoch, i: number) => (
        <Card key={i} padding="sm">
          <h2 className="font-display font-semibold text-primary">{epoch.label}</h2>
          {epoch.experiences
            .filter((e) => e.title || e.howItShapedMe)
            .map((exp, j) => (
              <div key={j} className="mt-3 border-t border-slate-100 pt-3">
                <p className="font-medium">{exp.title}</p>
                <p className="mt-1 text-sm text-muted">{exp.howItShapedMe}</p>
              </div>
            ))}
        </Card>
      ))}
      <ExportButtons
        onExportMd={() => exportModule("past", data, "md")}
        onExportTxt={() => exportModule("past", data, "txt")}
      />
      <Button variant="secondary" className="w-full" onClick={() => setData(defaultData())}>
        Start Over
      </Button>
    </div>
  );
}
