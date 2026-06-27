import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  AuthoringData,
  AuthoringModule,
  PresentAuthoringOverview,
} from "@self-authoring/shared";
import { useAuthStore } from "../stores";
import { api } from "../lib/api";
import { getModuleProgress } from "../lib/progress";
import { Card } from "../components/Card";
import { Badge } from "../components/Badge";
import { PageHeader } from "../components/PageHeader";
import { ProgressRing } from "../components/ProgressRing";
import {
  CompletionStatusPanel,
  type StatusItem,
} from "../components/CompletionStatusPanel";

interface DocSummary {
  module: AuthoringModule;
  data: AuthoringData;
  updatedAt: string;
}

const programs: {
  to: string;
  title: string;
  desc: string;
  key: AuthoringModule;
  module: AuthoringModule;
}[] = [
  {
    to: "/present",
    title: "Present Authoring",
    desc: "Faults and Virtues assessment, narrowing, and reflection",
    key: "present",
    module: "present",
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

/** Home dashboard with program progress and completion status. */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [presentOverview, setPresentOverview] = useState<PresentAuthoringOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ documents: DocSummary[] }>("/authoring"),
      api<{ presentOverview: PresentAuthoringOverview | null }>("/profile").catch(() => null),
    ])
      .then(([authoring, profile]) => {
        setDocs(authoring.documents);
        if (profile) setPresentOverview(profile.presentOverview);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const moduleProgress = useMemo(() => {
    const map = new Map<AuthoringModule, ReturnType<typeof getModuleProgress>>();
    for (const doc of docs) {
      map.set(doc.module, getModuleProgress(doc.module, doc.data));
    }
    return map;
  }, [docs]);

  const overallProgress = useMemo(() => {
    const authoringModules: AuthoringModule[] = ["present", "past", "future"];
    const total = authoringModules.reduce(
      (sum, m) => sum + (moduleProgress.get(m)?.percent ?? 0),
      0
    );
    return Math.round(total / authoringModules.length);
  }, [moduleProgress]);

  const presentDoc = docs.find((d) => d.module === "present");
  const presentProgress = moduleProgress.get("present");
  const presentComplete = presentProgress?.status === "complete";

  const statusItems = useMemo((): StatusItem[] => {
    const items: StatusItem[] = [];

    for (const p of programs) {
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

    items.push({
      id: "present-overview",
      title: "Present AI Overview",
      to: "/present",
      status: presentOverview
        ? "complete"
        : presentComplete
          ? "in_progress"
          : "not_started",
      percent: presentOverview ? 100 : presentComplete ? 50 : 0,
      stepLabel: presentOverview
        ? "Generated"
        : presentComplete
          ? "Ready to generate"
          : "Requires Present Authoring",
      updatedAt: presentDoc?.updatedAt,
    });

    return items;
  }, [docs, moduleProgress, presentOverview, presentComplete, presentDoc?.updatedAt]);

  const completedCount = statusItems.filter((i) => i.status === "complete").length;
  const inProgressCount = statusItems.filter((i) => i.status === "in_progress").length;

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
        subtitle="Track your self-authoring progress across all programs."
        meta={`${user?.email} · ${completedCount} of ${statusItems.length} complete`}
      />

      <CompletionStatusPanel items={statusItems} />

      <div className="grid gap-4 sm:grid-cols-3">
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
          <p className="text-xs text-muted">of {statusItems.length} milestones</p>
        </Card>

        <Card padding="sm" className="animate-fade-up animate-fade-up-delay-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">In Progress</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-primary">
            {inProgressCount}
          </p>
          <p className="text-xs text-muted">active programmes</p>
        </Card>
      </div>

      {!presentComplete && (
        <Card>
          <h2 className="font-display text-lg font-semibold text-primary">Get Started</h2>
          <p className="mt-2 text-sm text-muted">
            Begin with Present Authoring to assess your personality faults and virtues, then
            continue with Past and Future Authoring.
          </p>
          <Link
            to="/present"
            className="mt-4 inline-flex text-sm font-semibold text-accent-dark hover:underline"
          >
            Start Present Authoring →
          </Link>
        </Card>
      )}

      <div>
        <h2 className="mb-4 font-display text-lg font-semibold text-primary">Programs</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => {
            const doc = docs.find((d) => d.module === p.module);
            const progress = moduleProgress.get(p.module);

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
                  {doc?.updatedAt && (
                    <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
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
