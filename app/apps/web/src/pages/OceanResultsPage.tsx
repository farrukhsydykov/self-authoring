import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { OceanScores, Trait } from "@self-authoring/shared";
import { TRAIT_LABELS } from "@self-authoring/shared";
import { api } from "../lib/api";
import { OceanExportButtons } from "../components/ExportButtons";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { PageHeader } from "../components/PageHeader";
import { TraitBar } from "../components/TraitBar";

/** OCEAN results visualization with detailed trait breakdown. */
export function OceanResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scores, setScores] = useState<OceanScores | null>(null);
  const [createdAt, setCreatedAt] = useState("");
  const [assessing, setAssessing] = useState(false);
  const [assessError, setAssessError] = useState("");

  useEffect(() => {
    if (!id) return;
    api<{ scores: OceanScores; createdAt: string }>(`/ocean/${id}`)
      .then((r) => {
        setScores(r.scores);
        setCreatedAt(r.createdAt);
      })
      .catch(() => {});
  }, [id]);

  const handleGenerateAnalysis = async () => {
    if (!id) return;
    setAssessing(true);
    setAssessError("");
    try {
      await api(`/ocean/${id}/assess`, { method: "POST", body: "{}" });
      navigate("/");
    } catch (err) {
      setAssessError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAssessing(false);
    }
  };

  if (!scores) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted">Loading results…</p>
      </div>
    );
  }

  const traits = (["O", "C", "E", "A", "N"] as Trait[]).map((trait) => ({
    key: trait,
    ...scores.traits[trait],
  }));

  const avgScore = Math.round(
    traits.reduce((sum, t) => sum + t.score, 0) / traits.length
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="OCEAN Results"
        subtitle="Your Big Five personality profile based on 300 Likert-scale responses."
        meta={`Completed ${new Date(createdAt).toLocaleString()}`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Mean Score</p>
          <p className="mt-1 font-display text-3xl font-semibold text-primary">{avgScore}</p>
          <p className="text-xs text-muted">Across all five traits</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Plasticity</p>
          <p className="mt-1 font-display text-3xl font-semibold text-primary">
            {scores.plasticity.score}
          </p>
          <Badge variant="accent" className="mt-2">
            {scores.plasticity.band}
          </Badge>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Stability</p>
          <p className="mt-1 font-display text-3xl font-semibold text-primary">
            {scores.stability.score}
          </p>
          <Badge variant="accent" className="mt-2">
            {scores.stability.band}
          </Badge>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {traits.map((t) => (
          <Card key={t.key}>
            <TraitBar
              trait={t.key}
              score={t.score}
              band={t.band}
              description={t.description}
            />
            <p className="mt-3 text-xs text-muted">
              {TRAIT_LABELS[t.key]} · 60 items assessed
            </p>
          </Card>
        ))}
      </div>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <h2 className="font-display text-lg font-semibold text-primary">AI Personality Analysis</h2>
        <p className="mt-2 text-sm text-muted">
          Generate a comprehensive psychological portrait based on your 300 answers — including
          strengths, growth areas, interpersonal style, and personalized recommendations.
        </p>
        {assessError && <p className="mt-3 text-sm text-red-600">{assessError}</p>}
        <Button className="mt-4 w-full sm:w-auto" onClick={handleGenerateAnalysis} disabled={assessing}>
          {assessing ? "Generating analysis…" : "Generate AI Analysis"}
        </Button>
      </Card>

      <div className="space-y-3">
        <OceanExportButtons scores={scores} createdAt={createdAt} />
        <Link to="/ocean">
          <Button variant="secondary" className="w-full">
            Retake Assessment
          </Button>
        </Link>
      </div>
    </div>
  );
}
