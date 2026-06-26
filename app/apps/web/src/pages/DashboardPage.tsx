import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  AuthoringData,
  AuthoringModule,
  OceanScores,
  PersonalityPortrait,
  Trait,
} from "@self-authoring/shared";
import oceanItems from "@self-authoring/shared/ocean-items.json";
import { useAuthStore, useOceanStore } from "../stores";
import { api } from "../lib/api";
import { getModuleProgress, getOceanProgress } from "../lib/progress";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { PageHeader } from "../components/PageHeader";
import { TraitBar } from "../components/TraitBar";
import { ProgressRing } from "../components/ProgressRing";
import { PersonalityPortraitCard } from "../components/PersonalityPortraitCard";
import {
  CompletionStatusPanel,
  type StatusItem,
} from "../components/CompletionStatusPanel";

const OCEAN_TOTAL = oceanItems.length;

interface DocSummary {
  module: AuthoringModule;
  data: AuthoringData;
  updatedAt: string;
}

interface OceanSummary {
  id: string;
  scores: OceanScores;
  createdAt: string;
}

const programs: {
  to: string;
  title: string;
  desc: string;
  key: AuthoringModule | "ocean";
  module?: AuthoringModule;
}[] = [
  {
    to: "/ocean",
    title: "OCEAN Assessment",
    desc: "300-item Big Five personality inventory",
    key: "ocean",
  },
  {
    to: "/faults",
    title: "Present — Faults",
    desc: "Analyze negative personality aspects",
    key: "faults",
    module: "faults",
  },
  {
    to: "/virtues",
    title: "Present — Virtues",
    desc: "Explore your positive traits",
    key: "virtues",
    module: "virtues",
  },
  {
    to: "/past",
    title: "Past Authoring",
    desc: "Seven life epochs and experiences",
    key: "past",
    module: "past",
  },
  {
    to: "/future",
    title: "Future Authoring",
    desc: "Envision and plan your ideal future",
    key: "future",
    module: "future",
  },
];

/** Home dashboard with stats, OCEAN overview, and program progress. */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const oceanDraft = useOceanStore((s) => s.draft);
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [oceanResults, setOceanResults] = useState<OceanSummary[]>([]);
  const [portrait, setPortrait] = useState<PersonalityPortrait | null>(null);
  const [portraitUpdatedAt, setPortraitUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ documents: DocSummary[] }>("/authoring"),
      api<{ results: OceanSummary[] }>("/ocean"),
      api<{ assessment: PersonalityPortrait; updatedAt: string }>("/profile").catch(() => null),
    ])
      .then(([authoring, ocean, profile]) => {
        setDocs(authoring.documents);
        setOceanResults(ocean.results);
        if (profile) {
          setPortrait(profile.assessment);
          setPortraitUpdatedAt(profile.updatedAt);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const latestOcean = oceanResults[0] ?? null;

  const moduleProgress = useMemo(() => {
    const map = new Map<AuthoringModule, ReturnType<typeof getModuleProgress>>();
    for (const doc of docs) {
      map.set(doc.module, getModuleProgress(doc.module, doc.data));
    }
    return map;
  }, [docs]);

  const overallProgress = useMemo(() => {
    const authoringModules: AuthoringModule[] = ["faults", "virtues", "past", "future"];
    const authoringPct =
      authoringModules.reduce((sum, m) => sum + (moduleProgress.get(m)?.percent ?? 0), 0) /
      authoringModules.length;
    const oceanPct = latestOcean ? 100 : 0;
    return Math.round((authoringPct + oceanPct) / 2);
  }, [moduleProgress, latestOcean]);

  const oceanAnswered = Object.keys(oceanDraft.answers).length;
  const oceanProgress = getOceanProgress(oceanAnswered, OCEAN_TOTAL, !!latestOcean);

  const statusItems = useMemo((): StatusItem[] => {
    const items: StatusItem[] = [
      {
        id: "ocean",
        title: "OCEAN Assessment",
        to: latestOcean ? `/ocean/results/${latestOcean.id}` : "/ocean",
        status: oceanProgress.status,
        percent: oceanProgress.percent,
        stepLabel: oceanProgress.stepLabel,
        detail: oceanProgress.detail,
        updatedAt: latestOcean?.createdAt,
      },
      {
        id: "portrait",
        title: "AI Personality Portrait",
        to: latestOcean ? `/ocean/results/${latestOcean.id}` : "/ocean",
        status: portrait ? "complete" : latestOcean ? "in_progress" : "not_started",
        percent: portrait ? 100 : latestOcean ? 50 : 0,
        stepLabel: portrait
          ? "Generated"
          : latestOcean
            ? "Ready to generate"
            : "Requires OCEAN assessment",
        updatedAt: portraitUpdatedAt ?? undefined,
      },
    ];

    for (const p of programs) {
      if (!p.module) continue;
      const doc = docs.find((d) => d.module === p.module);
      const progress = moduleProgress.get(p.module) ?? {
        percent: 0,
        stepLabel: "Not started",
        status: "not_started" as const,
      };
      items.push({
        id: p.key,
        title: p.title,
        to: p.to,
        status: progress.status,
        percent: progress.percent,
        stepLabel: progress.stepLabel,
        detail: progress.detail,
        updatedAt: doc?.updatedAt,
      });
    }

    return items;
  }, [docs, moduleProgress, latestOcean, oceanProgress, portrait, portraitUpdatedAt]);

  const completedCount = statusItems.filter((i) => i.status === "complete").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted">Loading your profile…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Track your personality assessment and self-authoring progress across all programs."
        meta={`${user?.email} · ${completedCount} of ${statusItems.length} complete`}
      />

      <CompletionStatusPanel items={statusItems} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card padding="sm" className="animate-fade-up animate-fade-up-delay-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Overall Progress</p>
          <div className="mt-3 flex items-center gap-4">
            <ProgressRing percent={overallProgress} size={56} />
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">{overallProgress}%</p>
              <p className="text-xs text-muted">Across all programs</p>
            </div>
          </div>
        </Card>

        <Card padding="sm" className="animate-fade-up animate-fade-up-delay-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Completed</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-primary">
            {completedCount}
          </p>
          <p className="text-xs text-muted">of {statusItems.length} total</p>
        </Card>

        <Card padding="sm" className="animate-fade-up animate-fade-up-delay-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">OCEAN Attempts</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-primary">
            {oceanResults.length}
          </p>
          {latestOcean && (
            <p className="text-xs text-muted">
              Latest {new Date(latestOcean.createdAt).toLocaleDateString()}
            </p>
          )}
        </Card>

        <Card padding="sm" className="animate-fade-up animate-fade-up-delay-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">AI Portrait</p>
          <div className="mt-2">
            {portrait ? (
              <>
                <Badge variant="success">Generated</Badge>
                {portraitUpdatedAt && (
                  <p className="mt-2 text-xs text-muted">
                    {new Date(portraitUpdatedAt).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <>
                <Badge variant="default">Not yet</Badge>
                <p className="mt-2 text-xs text-muted">
                  {latestOcean ? "Ready to generate" : "Complete OCEAN first"}
                </p>
              </>
            )}
          </div>
        </Card>
      </div>

      {latestOcean && (
        <Card className="animate-fade-up animate-fade-up-delay-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-primary">Latest OCEAN Scores</h2>
              <p className="text-xs text-muted">
                Assessed {new Date(latestOcean.createdAt).toLocaleString()}
              </p>
            </div>
            <Link
              to={`/ocean/results/${latestOcean.id}`}
              className="text-sm font-medium text-accent-dark hover:underline"
            >
              View full results →
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {(["O", "C", "E", "A", "N"] as Trait[]).map((trait) => {
                const t = latestOcean.scores.traits[trait];
                return (
                  <TraitBar
                    key={trait}
                    trait={trait}
                    score={t.score}
                    band={t.band}
                    compact
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-surface p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Plasticity</p>
                <p className="mt-1 font-display text-3xl font-semibold text-primary">
                  {latestOcean.scores.plasticity.score}
                </p>
                <Badge variant="accent" className="mt-2">
                  {latestOcean.scores.plasticity.band}
                </Badge>
                <p className="mt-2 text-xs text-muted">Extraversion + Openness</p>
              </div>
              <div className="rounded-xl border border-border bg-surface p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Stability</p>
                <p className="mt-1 font-display text-3xl font-semibold text-primary">
                  {latestOcean.scores.stability.score}
                </p>
                <Badge variant="accent" className="mt-2">
                  {latestOcean.scores.stability.band}
                </Badge>
                <p className="mt-2 text-xs text-muted">C + A + Emotional Stability</p>
              </div>
              {oceanResults.length > 1 && (
                <div className="col-span-2 rounded-xl border border-border bg-surface p-3">
                  <p className="text-xs font-medium text-muted">Assessment History</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {oceanResults.slice(0, 5).map((r, i) => (
                      <Link
                        key={r.id}
                        to={`/ocean/results/${r.id}`}
                        className="rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-xs transition hover:border-primary/30"
                      >
                        {i === 0 ? "Latest" : new Date(r.createdAt).toLocaleDateString()}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {portrait ? (
        <PersonalityPortraitCard portrait={portrait} updatedAt={portraitUpdatedAt ?? undefined} />
      ) : latestOcean ? (
        <Card className="border-accent/30 bg-accent/5">
          <h2 className="font-display text-lg font-semibold text-primary">AI Personality Portrait</h2>
          <p className="mt-2 text-sm text-muted">
            You have OCEAN results ready. Generate a comprehensive psychological portrait based on
            your 300 responses.
          </p>
          <Link
            to={`/ocean/results/${latestOcean.id}`}
            className="mt-4 inline-flex text-sm font-semibold text-accent-dark hover:underline"
          >
            Generate your analysis →
          </Link>
        </Card>
      ) : (
        <Card>
          <h2 className="font-display text-lg font-semibold text-primary">Get Started</h2>
          <p className="mt-2 text-sm text-muted">
            Begin with the OCEAN assessment to establish your Big Five baseline and unlock your AI
            personality portrait.
          </p>
          <Link
            to="/ocean"
            className="mt-4 inline-flex text-sm font-semibold text-accent-dark hover:underline"
          >
            Start OCEAN assessment →
          </Link>
        </Card>
      )}

      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-primary">Programs</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {programs.map((p) => {
            const doc = docs.find((d) => d.module === p.module);
            const progress = p.module
              ? moduleProgress.get(p.module)
              : p.key === "ocean"
                ? oceanProgress
                : null;
            const oceanDone = p.key === "ocean" && latestOcean;

            return (
              <Link
                key={p.key}
                to={p.to}
                className="group block rounded-2xl border border-border bg-surface-elevated p-5 shadow-sm transition hover:border-primary/25 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-primary group-hover:text-primary-light">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted">{p.desc}</p>
                  </div>
                  {progress && (
                    <ProgressRing percent={progress.percent} size={44} strokeWidth={3} />
                  )}
                  {oceanDone && p.key === "ocean" && progress?.status === "complete" && (
                    <Badge variant="success">Complete</Badge>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {progress && (
                    <>
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
                    </>
                  )}
                  {oceanDone && (
                    <span>
                      {oceanResults.length} result{oceanResults.length > 1 ? "s" : ""} saved
                    </span>
                  )}
                  {doc?.updatedAt && (
                    <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                  )}
                  {p.key === "ocean" && latestOcean && !doc && (
                    <span>Updated {new Date(latestOcean.createdAt).toLocaleDateString()}</span>
                  )}
                </div>

                {progress && progress.percent > 0 && progress.percent < 100 && (
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
