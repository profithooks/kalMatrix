// src/pages/Epics/EpicsPage.jsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import RiskBadge from "../../components/ui/RiskBadge";
import { useEpicRiskData } from "../../query/hooks/useEpicRiskData";

const RISK_FILTERS = [
  { id: "all", label: "All" },
  { id: "healthy", label: "Healthy" },
  { id: "at_risk", label: "At risk" },
  { id: "red_zone", label: "Red zone" },
];

const SORT_OPTIONS = [
  { id: "risk_desc", label: "Risk: High → Low" },
  { id: "risk_asc", label: "Risk: Low → High" },
  { id: "name_asc", label: "Name: A → Z" },
];

function classifyRisk(risk) {
  const p = Math.round((typeof risk === "number" ? risk : 0) * 100);
  if (p >= 70) return "red_zone";
  if (p >= 50) return "at_risk";
  return "healthy";
}

export default function EpicsPage() {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("risk_desc");

  const [windowFilter, setWindowFilter] = useState("all");
  const [includeCompleted, setIncludeCompleted] = useState(false);

  const { data, isLoading, isError } = useEpicRiskData();
  const epics = data?.epics || [];

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

  const { visibleEpics, counts } = useMemo(() => {
    if (!epics.length) {
      return {
        visibleEpics: [],
        counts: { total: 0, healthy: 0, atRisk: 0, redZone: 0 },
      };
    }

    const base = includeCompleted ? epics : epics.filter(isOpenEpic);
    let list = [...base];

    // search
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

    // window filter
    if (windowFilter !== "all") {
      list = list.filter((e) => {
        const bucket = windowBucket(e.window || e.raw?.window);
        return bucket === windowFilter;
      });
    }

    // risk filter
    if (riskFilter !== "all") {
      list = list.filter((e) => classifyRisk(e.risk) === riskFilter);
    }

    // sort
    list.sort((a, b) => {
      if (sortBy === "risk_desc") return b.risk - a.risk;
      if (sortBy === "risk_asc") return a.risk - b.risk;
      if (sortBy === "name_asc")
        return (a.epic || "").localeCompare(b.epic || "");

      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });

    // counts
    const total = base.length;
    const healthy = base.filter(
      (e) => classifyRisk(e.risk) === "healthy"
    ).length;
    const atRisk = base.filter(
      (e) => classifyRisk(e.risk) === "at_risk"
    ).length;
    const redZone = base.filter(
      (e) => classifyRisk(e.risk) === "red_zone"
    ).length;

    return {
      visibleEpics: list,
      counts: { total, healthy, atRisk, redZone },
    };
  }, [epics, includeCompleted, search, windowFilter, riskFilter, sortBy]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50 text-xs text-neutral-600 dark:bg-[#050506] dark:text-zinc-400">
        Loading epics…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50 p-8 text-xs text-red-500 dark:bg-[#050506] dark:text-red-400">
        Failed to load epics. Please refresh.
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-zinc-50 text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
        {/* HERO */}
        <section className="space-y-4">
          {/* <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 dark:text-zinc-500">
            Epics radar
          </p> */}

          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-zinc-50 sm:text-[30px] md:text-[34px]">
            Every epic your radar
            <br className="hidden sm:block" />
            <span className="sm:ml-1">is quietly judging.</span>
          </h1>

          <p className="max-w-xl text-sm text-neutral-600 dark:text-zinc-400">
            A clean list of all epics currently tracked by KalMatrix’s delivery
            radar. Sort by risk, filter by bands and windows, and click in for
            the full story.
          </p>

          {/* COUNTS */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-neutral-600 dark:text-zinc-500 sm:gap-3">
            <Pill>
              <span className="font-mono text-neutral-900 dark:text-zinc-100">
                {counts.total}
              </span>{" "}
              epics in scope
            </Pill>
            <Pill>
              <span className="font-mono text-emerald-600 dark:text-emerald-300">
                {counts.healthy}
              </span>{" "}
              healthy
            </Pill>
            <Pill>
              <span className="font-mono text-amber-600 dark:text-amber-300">
                {counts.atRisk}
              </span>{" "}
              at risk
            </Pill>
            <Pill>
              <span className="font-mono text-red-600 dark:text-red-300">
                {counts.redZone}
              </span>{" "}
              in red zone
            </Pill>
          </div>
        </section>

        {/* SUMMARY STRIP */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <MetricTile label="Total epics" value={counts.total} tone="neutral" />
          <MetricTile label="Healthy" value={counts.healthy} tone="green" />
          <MetricTile label="At risk" value={counts.atRisk} tone="amber" />
          <MetricTile label="Red zone" value={counts.redZone} tone="red" />
        </section>

        {/* WINDOW FILTERS */}
        <section className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <FilterPill
            label="All windows"
            active={windowFilter === "all"}
            onClick={() => setWindowFilter("all")}
          />
          <FilterPill
            label="0–2 weeks"
            active={windowFilter === "0_2"}
            onClick={() => setWindowFilter("0_2")}
          />
          <FilterPill
            label="2–4 weeks"
            active={windowFilter === "2_4"}
            onClick={() => setWindowFilter("2_4")}
          />
          <FilterPill
            label="4–6 weeks"
            active={windowFilter === "4_6"}
            onClick={() => setWindowFilter("4_6")}
          />
          <FilterPill
            label="6+ weeks"
            active={windowFilter === "6_plus"}
            onClick={() => setWindowFilter("6_plus")}
          />
          <FilterPill
            label="Past due"
            active={windowFilter === "past_due"}
            onClick={() => setWindowFilter("past_due")}
          />
          <FilterPill
            label="Completed"
            active={windowFilter === "completed"}
            onClick={() => setWindowFilter("completed")}
          />
        </section>

        {/* TOGGLE */}
        <section className="mt-3 flex items-center gap-2 text-xs text-neutral-600 dark:text-zinc-400">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={includeCompleted}
              onChange={(e) => setIncludeCompleted(e.target.checked)}
              className="h-3 w-3 rounded border-neutral-400 bg-white dark:border-zinc-600 dark:bg-black"
            />
            <span>Include completed epics in counts & list</span>
          </label>
        </section>

        {/* CONTROLS */}
        <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* SEARCH */}
          <div className="flex w-full items-center gap-2 md:max-w-xs">
            <input
              type="text"
              placeholder="Search epics by title or key…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
            />
          </div>

          {/* SORT + RISK FILTER */}
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              options={RISK_FILTERS}
              value={riskFilter}
              onChange={setRiskFilter}
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-[11px] text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-100 dark:focus:border-zinc-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* EPICS LIST */}
        <section className="space-y-2">
          {visibleEpics.length === 0 ? (
            <Card className="border border-neutral-200 bg-white/90 px-4 py-6 text-sm text-neutral-600 shadow-sm dark:border-zinc-900 dark:bg-black/80 dark:text-zinc-400 sm:px-6 sm:py-8">
              No epics match the current filters.
            </Card>
          ) : (
            visibleEpics.map((epic) => <EpicRow key={epic.id} epic={epic} />)
          )}
        </section>
      </div>
    </div>
  );
}

/* --- EPIC ROW ---------------------------------------------------------- */

function EpicRow({ epic }) {
  const title = epic.epic || "Untitled epic";
  const riskPercent = Math.round((epic.risk || 0) * 100);
  const band = classifyRisk(epic.risk);
  const jiraKey = epic.raw?.key;
  const jiraState = epic.raw?.state || epic.raw?.status || "Unknown state";
  const windowLabel = epic.window || epic.raw?.window || "Unknown window";
  const primarySignal = epic.signals?.[0];

  const bandLabel =
    band === "red_zone"
      ? "Red zone"
      : band === "at_risk"
      ? "At risk"
      : "Healthy";

  return (
    <Link
      to={`/epic/${epic.id}`}
      className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white/90 px-4 py-3 text-sm shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-zinc-900 dark:bg-black/80 dark:hover:border-zinc-700 dark:hover:bg-black"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium text-neutral-900 dark:text-zinc-100">
          {title}
        </span>

        <span className="truncate text-[11px] text-neutral-500 dark:text-zinc-500">
          {jiraKey ? `${jiraKey} · ${jiraState}` : jiraState}
        </span>

        <span className="mt-1 line-clamp-1 text-[11px] text-neutral-500 dark:text-zinc-500">
          {windowLabel}
          {primarySignal ? ` · ${primarySignal}` : null}
        </span>
      </div>

      <div className="ml-4 flex shrink-0 items-center gap-4 text-[11px]">
        <span className="text-neutral-500 dark:text-zinc-400">
          {bandLabel} ·{" "}
          <span className="font-mono text-neutral-900 dark:text-zinc-100">
            {riskPercent}%
          </span>
        </span>
        <RiskBadge risk={epic.risk} />
      </div>
    </Link>
  );
}

/* --- UTIL COMPONENTS --------------------------------------------------- */

function MetricTile({ label, value, tone }) {
  let bar;
  if (tone === "green") bar = "bg-emerald-400";
  else if (tone === "amber") bar = "bg-amber-300";
  else if (tone === "red") bar = "bg-red-400";
  else bar = "bg-neutral-400 dark:bg-zinc-400";

  return (
    <Card className="border border-neutral-200 bg-white/90 px-4 py-4 shadow-sm dark:border-zinc-900 dark:bg-black/80">
      <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
        {label}
      </span>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-neutral-900 dark:text-zinc-50">
          {value}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-zinc-900">
        <div className={`h-full w-3/4 ${bar}`} />
      </div>
    </Card>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-neutral-300 bg-white p-0.5 text-[11px] shadow-sm dark:border-zinc-800 dark:bg-black/80">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-2.5 py-1 transition ${
              active
                ? "bg-neutral-900 text-white dark:bg-zinc-100 dark:text-black"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white/90 px-3 py-1 text-neutral-700 shadow-sm dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-300">
      {children}
    </span>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[0.7rem] transition ${
        active
          ? "bg-neutral-900 text-white dark:bg-zinc-100 dark:text-black"
          : "border border-neutral-300 bg-white text-neutral-600 shadow-sm hover:bg-neutral-100 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-300 dark:hover:bg-zinc-900"
      }`}
    >
      {label}
    </button>
  );
}
