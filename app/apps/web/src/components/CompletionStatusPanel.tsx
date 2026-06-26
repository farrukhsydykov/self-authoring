import { Link } from "react-router-dom";
import type { CompletionStatus } from "../lib/progress";
import { Card } from "./Card";
import { Badge } from "./Badge";

export interface StatusItem {
  id: string;
  title: string;
  to: string;
  status: CompletionStatus;
  percent: number;
  stepLabel: string;
  detail?: string;
  updatedAt?: string;
}

interface CompletionStatusPanelProps {
  items: StatusItem[];
}

const STATUS_LABELS: Record<CompletionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

const STATUS_BADGE: Record<CompletionStatus, "default" | "warning" | "success"> = {
  not_started: "default",
  in_progress: "warning",
  complete: "success",
};

/** At-a-glance completion status for all assessments and programs. */
export function CompletionStatusPanel({ items }: CompletionStatusPanelProps) {
  const complete = items.filter((i) => i.status === "complete").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const notStarted = items.filter((i) => i.status === "not_started").length;

  return (
    <Card>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-primary">Completion Status</h2>
          <p className="mt-1 text-sm text-muted">
            {complete} complete · {inProgress} in progress · {notStarted} not started
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Complete
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            In progress
          </span>
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            Not started
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.to}
            className="block rounded-xl border border-border bg-surface p-4 transition hover:border-primary/25 hover:bg-surface-elevated"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-primary">{item.title}</h3>
                  <Badge variant={STATUS_BADGE[item.status]}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{item.stepLabel}</p>
                {item.detail && (
                  <p className="mt-0.5 text-xs text-muted">{item.detail}</p>
                )}
                {item.updatedAt && (
                  <p className="mt-1 text-xs text-muted/80">
                    Last updated {new Date(item.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-4 sm:w-48">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted">Progress</span>
                    <span className="font-medium tabular-nums text-primary">
                      {item.percent}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.status === "complete"
                          ? "bg-emerald-500"
                          : item.status === "in_progress"
                            ? "bg-amber-500"
                            : "bg-slate-300"
                      }`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-accent-dark sm:hidden">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
