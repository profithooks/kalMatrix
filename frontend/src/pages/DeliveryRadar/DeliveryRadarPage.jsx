// src/pages/DeliveryRadar/DeliveryRadarPage.jsx
import { useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import RiskDistributionBar from "./RiskDistributionBar";
import SignalsDrawer from "./SignalsDrawer";
import { useEpicRiskData } from "../../query/hooks/useEpicRiskData";
import { useRebuildPredictions } from "../../query/mutations/useRebuildPredictions";
import { useToastStore } from "../../store/toastStore";

export default function DeliveryRadarPage() {
  const [selectedEpicId, setSelectedEpicId] = useState(null);
  const [search] = useState(""); // search currently not exposed in UI
  const [riskFilter] = useState("all"); // same
  const [sortBy] = useState("risk_desc");
  const [showOnlyWithPlan, setShowOnlyWithPlan] = useState(false);

  const { data: riskData, isLoading, isError } = useEpicRiskData();
  const epics = riskData?.epics || [];
  const meta = riskData?.meta || null;

  // Team execution metrics coming from backend meta
  const teamStats = Array.isArray(meta?.teams) ? meta.teams : [];

  const rebuildPredictions = useRebuildPredictions();
  const { showToast } = useToastStore();

  // If backend ever sends this, we can use it later
  const summary = riskData?.summary ?? {
    total: 0,
    healthy: 0,
    atRisk: 0,
    redZone: 0,
  };

  const lastRunAt = meta?.lastRunAt || meta?.updatedAt || null;
  const sourceLabel = meta?.sourceLabel || meta?.provider || "Jira";

  const {
    visibleEpics,
    topThree,
    counts,
    avgRisk,
    maxRisk,
    redZoneShare,
    activeTotal,
  } = useMemo(() => {
    if (!epics.length) {
      return {
        visibleEpics: [],
        topThree: [],
        counts: { total: 0, healthy: 0, atRisk: 0, redZone: 0 },
        avgRisk: 0,
        maxRisk: 0,
        redZoneShare: 0,
        activeTotal: 0,
      };
    }

    // 1) All open epics in workspace
    const open = epics.filter(isOpenEpic);
    const activeTotal = open.length;

    // 2) Radar horizon = 0–6 weeks + Past due (NO completed, NO 6+ weeks)
    const radarEpics = open.filter((e) => {
      const bucket = windowBucket(e.window || e.raw?.window);
      if (bucket === "past_due") return true;
      if (bucket === "0_2" || bucket === "2_4" || bucket === "4_6") return true;
      return false; // drops 6_plus, completed, unknown
    });

    let list = [...radarEpics];

    // 3) Stats on *radar* set
    const risks = list.map((e) => (typeof e.risk === "number" ? e.risk : 0));
    const avgRisk =
      risks.length > 0 ? risks.reduce((a, b) => a + b, 0) / risks.length : 0;
    const maxRisk = risks.length > 0 ? Math.max(...risks) : 0;
    const redCount = list.filter(
      (e) => classifyRisk(e.risk) === "red_zone"
    ).length;
    const redZoneShare = list.length > 0 ? redCount / list.length : 0;

    // 4) Search
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((e) => {
        const title = e.epic || "";
        const key = e.raw?.key || "";
        return (
          title.toLowerCase().includes(term) || key.toLowerCase().includes(term)
        );
      });
    }

    // 5) Filter by band
    if (riskFilter !== "all") {
      list = list.filter((e) => classifyRisk(e.risk) === riskFilter);
    }

    // 6) Filter: only epics that actually have a recovery plan
    if (showOnlyWithPlan) {
      list = list.filter((e) => hasRecoveryPlan(e));
    }

    // 7) Sort
    list.sort((a, b) => {
      if (sortBy === "risk_desc") return b.risk - a.risk;
      if (sortBy === "risk_asc") return a.risk - b.risk;

      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });

    const topThree = [...list].slice(0, 3);

    const counts = {
      total: radarEpics.length,
      healthy: radarEpics.filter((e) => classifyRisk(e.risk) === "healthy")
        .length,
      atRisk: radarEpics.filter((e) => classifyRisk(e.risk) === "at_risk")
        .length,
      redZone: radarEpics.filter((e) => classifyRisk(e.risk) === "red_zone")
        .length,
    };

    return {
      visibleEpics: list,
      topThree,
      counts,
      avgRisk,
      maxRisk,
      redZoneShare,
      activeTotal,
    };
  }, [epics, search, riskFilter, sortBy, showOnlyWithPlan]);

  const handleRebuild = () => {
    rebuildPredictions.mutate(undefined, {
      onSuccess: () => {
        showToast({
          type: "success",
          title: "Predictions refreshed",
          message: "Radar will update as new signals are computed.",
        });
      },
      onError: (err) => {
        console.error("Rebuild predictions failed", err);
        showToast({
          type: "error",
          title: "Sync failed",
          message:
            err?.response?.data?.error ||
            "Could not rebuild predictions. Try again in a minute.",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50 text-xs text-zinc-600 dark:bg-black dark:text-zinc-500">
        Loading delivery radar…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50 p-8 text-xs text-red-500 dark:bg-black dark:text-red-400">
        Failed to load radar data. Please refresh.
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-zinc-50 text-zinc-900 dark:bg-[#050506] dark:text-zinc-50">
      {/* whole page scrolls */}
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
        {/* TOP: HERO + RADAR HEALTH */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] lg:gap-8">
          <section className="space-y-4">
            <h1 className="text-[30px] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-[32px] md:text-[36px]">
              Your next 4–6 weeks,
              <br className="hidden sm:block" />
              <span className="sm:ml-1">on one clean radar.</span>
            </h1>
            <p className="max-w-xl text-base text-zinc-600 dark:text-zinc-300">
              We compress every Jira signal into one simple view. No boards. No
              swimlanes. Just the few epics that will actually blow up your
              quarter if you ignore them.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 sm:gap-3">
              <Pill>
                Connected to{" "}
                <span className="ml-1 font-medium text-zinc-900 dark:text-zinc-50">
                  {sourceLabel}
                </span>
              </Pill>
              {lastRunAt && (
                <Pill>
                  Last risk run{" "}
                  <span className="ml-1 font-mono text-zinc-800 dark:text-zinc-50">
                    {formatDateTime(lastRunAt)}
                  </span>
                </Pill>
              )}
              {counts.total ? (
                <Pill>
                  <span className="whitespace-nowrap">
                    Watching {activeTotal} active epics · {counts.total} on this
                    radar
                  </span>
                </Pill>
              ) : null}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <Card className="border border-zinc-200 bg-white/90 px-4 py-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 sm:px-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-700 dark:text-zinc-400">
                    Radar health
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    One number for how nervous you should be.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="flex flex-col items-end">
                    <span className="text-[32px] font-bold leading-none text-zinc-900 dark:text-zinc-50 sm:text-[32px]">
                      {Math.round(avgRisk * 100)}
                    </span>
                    <span className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-400">
                      Avg risk
                    </span>
                  </div>
                  <div className="hidden h-10 w-px bg-zinc-200 dark:bg-zinc-700 sm:block" />
                  <div className="flex flex-col items-end gap-1 text-sm text-zinc-600 dark:text-zinc-300">
                    <span>
                      Peak epic:{" "}
                      <span className="font-mono text-zinc-900 dark:text-zinc-50">
                        {Math.round(maxRisk * 100)}%
                      </span>
                    </span>
                    <span>
                      Red zone share:{" "}
                      <span className="font-mono text-zinc-900 dark:text-zinc-50">
                        {Math.round(redZoneShare * 100)}%
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <RiskDistributionBar
                  total={counts.total ?? 0}
                  healthy={counts.healthy ?? 0}
                  atRisk={counts.atRisk ?? 0}
                  redZone={counts.redZone ?? 0}
                />
              </div>
            </Card>
          </section>
        </div>

        {teamStats.length > 0 && (
          <section className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-300 dark:text-neutral-200">
                  Team execution breakdown
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Avg cycle time and throughput per team, based on recent epics.
                </p>
              </div>
            </div>

            <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {teamStats.map((team) => (
                <TeamExecutionCard key={team.name || team.id} team={team} />
              ))}
            </div>
          </section>
        )}
        {/* MIDDLE: METRICS + HOTTEST EPICS */}
        <div className="grid items-stretch gap-4 md:gap-6 md:grid-cols-2">
          {/* METRICS PANEL */}
          <section className="h-full">
            <Card className="flex h-full flex-col justify-between border border-zinc-200 bg-white/90 px-4 py-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <MetricTile
                  label="Healthy"
                  value={counts.healthy ?? 0}
                  tone="green"
                />
                <MetricTile
                  label="At risk"
                  value={counts.atRisk ?? 0}
                  tone="amber"
                />
                <MetricTile
                  label="Red zone"
                  value={counts.redZone ?? 0}
                  tone="red"
                />
              </div>

              <div className="mt-4 text-xs text-zinc-600 dark:text-zinc-400">
                Snapshot of all epics that are inside the 0–6 week window + past
                due.
              </div>
            </Card>
          </section>

          {/* HOTTEST EPICS PANEL */}
          <section className="h-full">
            <Card className="flex h-full flex-col border border-zinc-200 bg-white/90 px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
              <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-700 dark:text-zinc-400">
                  Hottest epics
                </p>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  Top 3 by risk, filtered
                </span>
              </div>

              {topThree.length === 0 ? (
                <p className="flex-1 py-4 text-sm text-zinc-700 dark:text-zinc-400">
                  No risky epics under current filters.
                </p>
              ) : (
                <ul className="flex-1 space-y-2">
                  {topThree.map((epic) => (
                    <li
                      key={epic.id}
                      className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm hover:shadow-md dark:border-zinc-700 dark:bg-zinc-950/80 dark:hover:border-zinc-600"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <span
                          className={`mt-0.5 h-6 w-1 rounded-full ${riskBandStripe(
                            epic.risk
                          )}`}
                        />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {epic.epic || "Untitled epic"}
                          </span>
                          <span className="mt-0.5 truncate text-xs text-zinc-700 dark:text-zinc-400">
                            {epic.raw?.key || "—"} ·{" "}
                            {epic.window || epic.raw?.window || "Past due"}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 flex flex-col items-end text-xs">
                        <RiskPill risk={epic.risk} />
                        {epic.dueDate && (
                          <span className="mt-0.5 text-xs text-zinc-700 dark:text-zinc-400">
                            ETA {formatShortDate(epic.dueDate)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
        {/* BOTTOM: FULL EPIC LIST – PAGE SCROLLS, TABLE NOT CLIPPED */}
        <section>
          <Card className="border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
            <header className="flex flex-col gap-2 border-b border-zinc-200 px-4 pb-3 pt-3 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-800 dark:text-zinc-100">
                  All active epics
                </h2>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-400">
                  Tap or click a row to see full risk story and signals.
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                <span>
                  Showing{" "}
                  <span className="font-mono text-zinc-900 dark:text-zinc-50">
                    {visibleEpics.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-mono text-zinc-900 dark:text-zinc-50">
                    {counts.total ?? epics.length}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => setShowOnlyWithPlan((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition ${
                    showOnlyWithPlan
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-500 bg-zinc-900/60 text-zinc-200 dark:border-zinc-600"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      showOnlyWithPlan ? "bg-emerald-400" : "bg-zinc-400"
                    }`}
                  />
                  Only epics with plan
                </button>
              </div>
            </header>

            <div className="mt-1 overflow-x-auto px-2 pb-3">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-[0.14em] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  <tr>
                    <th className="px-4 py-2 text-left font-normal">Epic</th>
                    <th className="px-4 py-2 text-left font-normal">Team</th>
                    <th className="px-4 py-2 text-left font-normal">Window</th>
                    <th className="px-4 py-2 text-left font-normal">ETA</th>
                    <th className="px-4 py-2 text-left font-normal">Risk</th>
                    <th className="px-4 py-2 text-left font-normal">Signals</th>
                    <th className="px-3 py-2 text-left font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEpics.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-sm text-zinc-700 dark:text-zinc-400"
                      >
                        No epics match your filters.
                      </td>
                    </tr>
                  ) : (
                    visibleEpics.map((epic) => {
                      const recovery =
                        epic.recovery || epic.raw?.recovery || null;
                      const hasRecovery = hasRecoveryPlan(epic);
                      const teamName = getTeamLabel(epic);

                      return (
                        <tr
                          key={epic.id}
                          onClick={() => setSelectedEpicId(epic.id)}
                          className="cursor-pointer rounded-2xl border border-transparent bg-white hover:bg-zinc-50 dark:border-transparent dark:bg-zinc-950/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                        >
                          <td className="max-w-[260px] px-4 py-2 align-top">
                            <div className="flex flex-col gap-0.5">
                              <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {epic.epic || "Untitled epic"}
                              </span>
                              <span className="truncate text-xs text-zinc-700 dark:text-zinc-400">
                                {epic.raw?.key || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2 align-top text-sm text-zinc-600 dark:text-zinc-300">
                            {teamName}
                          </td>

                          <td className="px-4 py-2 align-top text-sm text-zinc-600 dark:text-zinc-300">
                            {epic.window || epic.raw?.window || "Unknown"}
                          </td>
                          <td className="px-4 py-2 align-top text-sm text-zinc-600 dark:text-zinc-300">
                            {epic.dueDate ? formatShortDate(epic.dueDate) : "—"}
                          </td>
                          <td className="px-4 py-2 align-top">
                            <RiskPill risk={epic.risk} />
                          </td>
                          <td className="px-4 py-2 align-top text-sm text-zinc-600 dark:text-zinc-300">
                            {epic.signals && epic.signals.length > 0 ? (
                              <span className="line-clamp-2">
                                {epic.signals[0]}
                              </span>
                            ) : (
                              <span className="text-zinc-700 dark:text-zinc-400">
                                No strong signals
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 align-top text-sm">
                            {hasRecovery ? (
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${planBadgeClass(
                                  recovery?.severity
                                )}`}
                              >
                                Plan ready
                              </span>
                            ) : (
                              <span className="text-zinc-700 dark:text-zinc-400">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
        {/* EPIC DETAILS DRAWER */}
        <SignalsDrawer
          epics={epics}
          selectedEpicId={selectedEpicId}
          onClose={() => setSelectedEpicId(null)}
        />
      </div>
    </div>
  );
}

/* helpers */

function classifyRisk(risk) {
  const value = typeof risk === "number" ? risk : 0;
  if (value >= 0.7) return "red_zone";
  if (value >= 0.5) return "at_risk";
  return "healthy";
}

function isOpenEpic(e) {
  if (e.raw?.isActive === false) return false;
  const statusCategory =
    e.raw?.statusCategory || e.raw?.stateCategory || e.raw?.state;
  if (
    typeof statusCategory === "string" &&
    statusCategory.toLowerCase() === "done"
  ) {
    return false;
  }
  return true;
}

function windowBucket(windowLabel) {
  if (!windowLabel) return "unknown";
  const w = String(windowLabel).toLowerCase();

  if (w.includes("past")) return "past_due";
  if (w.includes("0–2") || w.includes("0-2")) return "0_2";
  if (w.includes("2–4") || w.includes("2-4")) return "2_4";
  if (w.includes("4–6") || w.includes("4-6")) return "4_6";
  if (w.includes("6+")) return "6_plus";
  if (w.includes("completed")) return "completed";
  return "unknown";
}

function riskBandStripe(risk) {
  const band = classifyRisk(risk);
  if (band === "red_zone") return "bg-red-500";
  if (band === "at_risk") return "bg-amber-300";
  return "bg-emerald-400";
}

function formatShortDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RiskPill({ risk }) {
  const value = typeof risk === "number" ? risk : 0;
  const percent = Math.round(value * 100);
  const band = classifyRisk(value);

  let bg = "bg-emerald-500/10";
  let text = "text-emerald-700 dark:text-emerald-300";
  let border = "border-emerald-500/40";

  if (band === "at_risk") {
    bg = "bg-amber-500/10";
    text = "text-amber-700 dark:text-amber-300";
    border = "border-amber-500/40";
  } else if (band === "red_zone") {
    bg = "bg-red-500/10";
    text = "text-red-700 dark:text-red-300";
    border = "border-red-500/40";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${bg} ${text} ${border}`}
    >
      {percent}% risk
    </span>
  );
}

function MetricTile({ label, value, tone }) {
  let bar;
  if (tone === "green") bar = "bg-emerald-400";
  else if (tone === "amber") bar = "bg-amber-300";
  else bar = "bg-red-400";

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white/90 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-900/80">
      <span className="text-xs uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-400">
        {label}
      </span>
      <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        {value}
      </span>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className={`h-full w-3/4 ${bar}`} />
      </div>
    </div>
  );
}

function PredictionPill({ meta }) {
  const accuracy = typeof meta?.accuracy === "number" ? meta.accuracy : null;
  const accuracyLabel = meta?.accuracyLabel || null;

  if (!accuracy && !accuracyLabel) {
    return (
      <div className="rounded-full border border-zinc-300 bg-white/80 px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
        Risk engine is warming up. It gets sharper as more signals come in.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-50">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.35)]" />
      <span className="font-medium">
        {accuracyLabel || "Prediction quality"}
      </span>
      {accuracy != null && (
        <span className="font-mono text-xs text-emerald-800 dark:text-emerald-100">
          {Math.round(accuracy)}%
        </span>
      )}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-400 bg-zinc-900/70 px-4 py-1.5 text-sm text-zinc-200 dark:border-zinc-600 dark:bg-zinc-950/80 dark:text-zinc-200">
      {children}
    </span>
  );
}

function planBadgeClass(severity) {
  switch (severity) {
    case "critical":
      return "bg-red-500/15 text-red-300 border border-red-500/50";
    case "high":
      return "bg-orange-500/15 text-orange-300 border border-orange-500/50";
    case "moderate":
      return "bg-amber-500/15 text-amber-300 border border-amber-500/50";
    case "low":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/50";
    default:
      return "bg-zinc-800 text-zinc-200 border border-zinc-700";
  }
}

function hasRecoveryPlan(epic) {
  if (!epic) return false;
  const recovery = epic.recovery || epic.raw?.recovery || null;
  if (!recovery) return false;
  if (!recovery.slipType || recovery.slipType === "none") return false;
  if (!Array.isArray(recovery.actions) || recovery.actions.length === 0)
    return false;
  return true;
}

function getTeamLabel(epic) {
  if (!epic) return "—";

  // 1) from normalized epic.team
  const team = epic.team;
  if (team) {
    if (typeof team === "string") return team;
    if (typeof team.name === "string" && team.name.trim()) return team.name;
    if (typeof team.key === "string" && team.key.trim()) return team.key;
  }

  // 2) from raw.team (can be string or object)
  const rawTeam = epic.raw?.team;
  if (rawTeam) {
    if (typeof rawTeam === "string") return rawTeam;
    if (typeof rawTeam.name === "string" && rawTeam.name.trim())
      return rawTeam.name;
    if (typeof rawTeam.key === "string" && rawTeam.key.trim())
      return rawTeam.key;
  }

  // 3) Fallbacks from project info
  if (
    typeof epic.raw?.projectName === "string" &&
    epic.raw.projectName.trim()
  ) {
    return epic.raw.projectName;
  }
  if (typeof epic.raw?.projectKey === "string" && epic.raw.projectKey.trim()) {
    return epic.raw.projectKey;
  }

  return "—";
}

function TeamExecutionCard({ team }) {
  const name = team.name || team.teamName || "Unknown team";
  const avgCycle =
    typeof team.avgCycleTimeDays === "number"
      ? team.avgCycleTimeDays.toFixed(1)
      : null;
  const throughput =
    typeof team.throughputPerWeek === "number"
      ? team.throughputPerWeek.toFixed(1)
      : null;
  const atRisk = team.atRiskEpics ?? team.atRiskCount ?? 0;
  const total = team.totalEpics ?? team.epicCount ?? 0;

  const atRiskPct =
    total > 0 ? Math.round((Number(atRisk) / Number(total)) * 100) : null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-zinc-50">
            {name}
          </p>
          <p className="text-xs text-neutral-500 dark:text-zinc-400">
            {total} epics · {atRisk} at risk
            {atRiskPct != null && ` (${atRiskPct}%)`}
          </p>
        </div>
        {avgCycle != null && (
          <span className="inline-flex items-center rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-mono uppercase tracking-[0.16em] text-neutral-50 dark:bg-zinc-100 dark:text-zinc-900">
            {avgCycle}d cycle
          </span>
        )}
      </div>

      <div className="mt-1 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-neutral-500 dark:text-zinc-400">
            Throughput / week
          </p>
          <p className="font-mono text-base text-neutral-900 dark:text-zinc-50">
            {throughput != null ? throughput : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 dark:text-zinc-400">
            Risk load
          </p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-amber-500 dark:bg-amber-400"
              style={{
                width:
                  atRiskPct != null
                    ? `${Math.min(Math.max(atRiskPct, 5), 100)}%`
                    : "0%",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
