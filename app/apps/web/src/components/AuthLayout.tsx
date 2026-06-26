import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

/** Split-panel auth layout with brand panel and form area. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-1/2 flex-col justify-between bg-primary-dark p-12 lg:flex">
        <div>
          <p className="font-display text-2xl font-semibold text-white">Self-Authoring</p>
          <p className="mt-2 text-sm text-white/50">Personality assessment & life programs</p>
        </div>
        <div className="max-w-md">
          <p className="font-display text-3xl font-medium leading-snug text-white/90">
            Understand yourself. Author your past, present, and future.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/40">
            A structured program combining the Big Five OCEAN inventory with guided
            self-authoring exercises — backed by psychological research.
          </p>
        </div>
        <p className="text-xs text-white/30">300-item assessment · 4 authoring modules</p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <p className="font-display text-2xl font-semibold text-primary lg:hidden">
            Self-Authoring
          </p>
          <h1 className="mt-6 font-display text-2xl font-semibold text-primary lg:mt-0">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8">{footer}</div>
        </div>
      </div>
    </div>
  );
}
