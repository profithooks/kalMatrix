import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Gauge,
  Users,
  GitBranch,
  Settings,
  Layers,
  CheckCircle2,
} from "lucide-react";

import ToastHost from "../components/ui/ToastHost";
import { useRebuildPredictions } from "../query/mutations/useRebuildPredictions";
import { useToastStore } from "../store/toastStore";
import { usePredictionAccuracy } from "../query/hooks/usePredictionAccuracy";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../theme/ThemeProvider";

export default function AppLayout() {
  const navItems = [
    { label: "Delivery Radar", to: "/radar", icon: Gauge },
    { label: "Weekly Check-ins", to: "/checkins", icon: CheckCircle2 },
    { label: "Teams", to: "/teams", icon: Users },
    { label: "Epics", to: "/epics", icon: Layers },
    { label: "Integrations", to: "/integrations", icon: GitBranch },
    { label: "Settings", to: "/settings", icon: Settings },
  ];
  const { theme, toggleTheme } = useTheme(); // kept for future theme toggle if you re-enable
  const location = useLocation();

  // Figure out current page label based on route
  const currentPage = navItems.find((item) => {
    if (location.pathname === item.to) return true;
    // handle nested routes like /teams/123
    return location.pathname.startsWith(item.to + "/");
  });
  const currentPageLabel = currentPage?.label || "KalMatrix";

  return (
    <>
      {/* Make the whole app a fixed viewport; only main scrolls */}
      <div className="flex h-screen overflow-hidden bg-neutral-950 text-white md:flex-row">
        {/* Sidebar (desktop / tablet) */}
        <aside className="hidden w-60 flex-col border-r border-zinc-800 bg-neutral-900 md:flex">
          <div className="border-b border-zinc-800 h-16 flex items-center px-4">
            <h1 className="text-xl font-semibold">KalMatrix</h1>
            {/* <p className="mt-1 text-xs text-zinc-500">Delivery Radar</p> */}
          </div>

          <nav className="mt-4 flex flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/radar"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Right side: top bar + content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar (stays fixed because only main scrolls) */}
          <header
            className="border-b border-zinc-800 bg-neutral-900/90 h-16 flex items-center px-4 sm:px-6
"
          >
            {/* Top row: current page + actions */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex items-center gap-2">
                {/* Show current page here instead of static "KalMatrix" */}
                <span className="text-sm font-semibold tracking-tight sm:text-base">
                  {currentPageLabel}
                </span>
                {/* <span className="hidden text-[0.7rem] uppercase tracking-[0.18em] text-zinc-500 sm:inline">
                  KalMatrix · Delivery Radar
                </span> */}
              </div>

              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                {/* Theme toggle kept for future */}
                {/* <button
                  type="button"
                  onClick={toggleTheme}
                  className="hidden items-center rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-[11px] text-zinc-800 shadow-sm hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:inline-flex"
                >
                  {theme === "dark" ? "☀ Light" : "🌙 Dark"}
                </button> */}

                <div className="hidden lg:block">
                  <PredictionAccuracyBadge />
                </div>

                <div className="hidden sm:block">
                  <RebuildPredictionsButton />
                </div>

                <UserBadge />
              </div>
            </div>

            {/* Mobile: nav + badges stacked */}
            <div className="mt-3 space-y-3 md:hidden">
              {/* Mobile nav */}
              <nav className="flex gap-1 overflow-x-auto pb-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/radar"}
                      className={({ isActive }) =>
                        `flex min-w-fit items-center gap-1 rounded-full px-3 py-1.5 text-[11px] transition ${
                          isActive
                            ? "bg-zinc-800 text-white"
                            : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                        }`
                      }
                    >
                      <Icon size={14} />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="flex flex-col gap-2 xs:flex-row xs:flex-wrap xs:items-center">
                <div className="xs:flex-1">
                  <PredictionAccuracyBadge />
                </div>
                <div className="xs:w-auto">
                  <RebuildPredictionsButton />
                </div>
              </div>
            </div>
          </header>

          {/* Page content: ONLY this scrolls */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Toasts */}
      <ToastHost />
    </>
  );
}

/* ----------------------------------------- */
/* GLOBAL REBUILD PREDICTIONS BUTTON */
/* ----------------------------------------- */
function RebuildPredictionsButton() {
  const rebuild = useRebuildPredictions();
  const showToast = useToastStore((s) => s.showToast);

  const handleRebuild = async () => {
    try {
      await rebuild.mutateAsync();

      showToast({
        title: "Predictions Rebuilt",
        message: "Signals & risk scores updated successfully.",
        type: "success",
      });
    } catch (err) {
      showToast({
        title: "Rebuild Failed",
        message: "Unable to refresh predictions.",
        type: "error",
      });
    }
  };

  return (
    <button
      onClick={handleRebuild}
      disabled={rebuild.isPending}
      className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-xs"
    >
      {rebuild.isPending ? "Rebuilding…" : "Rebuild Predictions"}
    </button>
  );
}

/* ----------------------------------------- */
/* PREDICTION ACCURACY BADGE */
/* ----------------------------------------- */
function PredictionAccuracyBadge() {
  const { data, isLoading, isError } = usePredictionAccuracy();

  if (isError) {
    return (
      <span className="inline-flex rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-[11px] text-red-300">
        Engine accuracy: unavailable
      </span>
    );
  }

  if (isLoading || !data) {
    return (
      <span className="inline-flex rounded-full border border-zinc-600/60 bg-zinc-800/70 px-3 py-1 text-[11px] text-zinc-300">
        Checking how often KalMatrix was right…
      </span>
    );
  }

  const { labelledEpics, accuracy, tp = 0, fp = 0, tn = 0, fn = 0 } = data;

  if (!labelledEpics) {
    return (
      <span className="inline-flex rounded-full border border-zinc-600/60 bg-zinc-800/70 px-3 py-1 text-[11px] text-zinc-300">
        KalMatrix is still learning – no completed epics with targets yet.
      </span>
    );
  }

  const pct = Math.round((accuracy || 0) * 100);
  const totalDelays = tp + fn;

  if (totalDelays === 0) {
    return (
      <span
        className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300"
        title={`${labelledEpics} completed epics with target dates; none actually slipped.`}
      >
        KalMatrix check: {labelledEpics} completed epics · 0 slipped so far
      </span>
    );
  }

  return (
    <span
      className="inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300"
      title={`Delays: KalMatrix correctly warned on ${tp}/${totalDelays} delayed epics. Overall accuracy across ${labelledEpics} completed epics is ${pct}%.`}
    >
      Delay calls: {tp}/{totalDelays} delays caught · {pct}% on {labelledEpics}{" "}
      completed epics
    </span>
  );
}

function UserBadge() {
  const user = useAuthStore((s) => s.user);
  const name = user?.name || user?.email?.split("@")[0] || "Demo User";

  return (
    <span
      className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300"
      title="Logged-in user"
    >
      {name}
    </span>
  );
}
