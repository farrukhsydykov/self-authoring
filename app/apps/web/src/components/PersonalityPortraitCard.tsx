import type { PersonalityPortrait } from "@self-authoring/shared";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { TraitBar } from "./TraitBar";

interface PersonalityPortraitCardProps {
  portrait: PersonalityPortrait;
  updatedAt?: string;
}

/** Renders the AI-generated personality portrait with rich trait data. */
export function PersonalityPortraitCard({ portrait, updatedAt }: PersonalityPortraitCardProps) {
  return (
    <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.03] to-surface-elevated">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-primary">
            Your Personality Portrait
          </h2>
          {updatedAt && (
            <p className="mt-1 text-xs text-muted">
              Generated {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <Badge variant="accent">AI Analysis</Badge>
      </div>

      <p className="mb-8 text-sm leading-relaxed whitespace-pre-line text-slate-800">
        {portrait.summary}
      </p>

      <div className="mb-8">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
          Trait Profile
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {portrait.traits.map((t) => (
            <div
              key={t.trait}
              className="rounded-xl border border-border bg-surface-elevated p-4"
            >
              <TraitBar
                label={t.trait}
                score={t.score}
                band={t.band}
                description={t.interpretation}
              />
              {t.facets.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {t.facets.map((facet) => (
                    <span
                      key={facet}
                      className="rounded-full bg-primary/5 px-2.5 py-0.5 text-xs text-primary/80"
                    >
                      {facet}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-emerald-800">Strengths</h3>
          <ul className="space-y-2">
            {portrait.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-emerald-900/80">
                <span className="text-emerald-600">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-amber-800">Growth Areas</h3>
          <ul className="space-y-2">
            {portrait.challenges.map((c) => (
              <li key={c} className="flex gap-2 text-sm text-amber-900/80">
                <span className="text-amber-600">→</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { title: "Interpersonal Style", text: portrait.interpersonalStyle },
          { title: "Work Style", text: portrait.workStyle },
          { title: "Emotional Pattern", text: portrait.emotionalPattern },
        ].map((section) => (
          <div key={section.title} className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-primary">{section.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">{section.text}</p>
          </div>
        ))}
      </div>

      {portrait.growthRecommendations.length > 0 && (
        <div className="rounded-xl border border-accent/25 bg-accent/5 p-5">
          <h3 className="mb-3 text-sm font-semibold text-accent-dark">Recommendations</h3>
          <ol className="space-y-2">
            {portrait.growthRecommendations.map((r, i) => (
              <li key={r} className="flex gap-3 text-sm text-slate-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent-dark">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}
