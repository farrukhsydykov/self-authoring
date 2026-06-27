import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores";
import { Button } from "./Button";

const navItems = [
  { to: "/", label: "Dashboard", icon: "◈", end: true },
  { to: "/present", label: "Present", icon: "◆", end: false },
  { to: "/past", label: "Past", icon: "◁", end: false },
  { to: "/future", label: "Future", icon: "▷", end: false },
];

/** App shell with sidebar (desktop) and bottom tab navigation (mobile). */
export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();

  const currentNav = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-56 shrink-0 flex-col bg-primary-dark lg:flex">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="font-display text-lg font-semibold text-white">Self-Authoring</p>
          <p className="mt-1 text-xs text-white/50">Personality & life programs</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "nav-active" : "nav-inactive"
                }`
              }
            >
              <span className="text-base leading-none opacity-80">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-xs text-white/40">{user?.email}</p>
          <Button
            variant="ghost"
            onClick={logout}
            className="mt-2 w-full !px-0 !py-1.5 text-left text-xs !text-white/60 hover:!bg-white/5 hover:!text-white"
          >
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-surface-elevated/90 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-display text-base font-semibold text-primary">Self-Authoring</p>
              {currentNav && (
                <p className="text-xs text-muted">{currentNav.label}</p>
              )}
            </div>
            <Button variant="ghost" onClick={logout} className="!px-2 !py-1.5 text-xs">
              Sign out
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8">
          <div className="animate-fade-up">
            <Outlet />
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface-elevated/95 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-lg justify-around px-1 py-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition ${
                    isActive ? "text-primary" : "text-muted"
                  }`
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
