// src/pages/Teams/TeamsPage.jsx
import { useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import TeamCard from "./TeamCard";
import TeamsSkeleton from "./TeamsSkeleton";
import { useTeamsRiskData } from "../../query/hooks/useTeamsRiskData";

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

function getTeamRisk(team) {
  if (typeof team.teamRisk === "number") return team.teamRisk; // 0–100
  if (typeof team.avgRiskScore === "number") return team.avgRiskScore; // 0–100
  return 0;
}

// Risk buckets on 0–100 scale
function classifyRisk(team) {
  const p = Math.round(getTeamRisk(team));
  if (p >= 65) return "red_zone";
  if (p >= 50) return "at_risk";
  return "healthy";
}

// Extract a displayable name from team.name object/string
function getTeamName(team) {
  const rawName = team.name;
  if (typeof rawName === "string") return rawName;
  if (rawName && typeof rawName === "object")
    return rawName.name || rawName.key || team.id;
  return team.id || "Unassigned";
}

export default function TeamsPage() {
  const { data, isLoading, isError } = useTeamsRiskData();
  const teams = data?.teams || [];
  console.log("teams", data, teams);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState("risk_desc");

  const { visibleTeams, counts } = useMemo(() => {
    let list = [...teams];

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((t) => getTeamName(t).toLowerCase().includes(term));
    }

    if (riskFilter !== "all") {
      list = list.filter((t) => classifyRisk(t) === riskFilter);
    }

    list.sort((a, b) => {
      const ar = getTeamRisk(a);
      const br = getTeamRisk(b);
      if (sortBy === "risk_desc") return br - ar;
      if (sortBy === "risk_asc") return ar - br;
      if (sortBy === "name_asc")
        return getTeamName(a).localeCompare(getTeamName(b));
      return 0;
    });

    const total = teams.length;
    const healthy = teams.filter((t) => getTeamRisk(t) < 50).length;
    const atRisk = teams.filter(
      (t) => getTeamRisk(t) >= 50 && getTeamRisk(t) < 65
    ).length;
    const redZone = teams.filter((t) => getTeamRisk(t) >= 65).length;

    return {
      visibleTeams: list,
      counts: { total, healthy, atRisk, redZone },
    };
  }, [teams, search, riskFilter, sortBy]);

  if (isLoading) return <TeamsSkeleton />;

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50 p-8 text-xs text-red-500 dark:bg-[#050506] dark:text-red-400">
        Failed to load teams. Try refreshing.
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-zinc-50 text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
        {/* HERO */}
        <section className="space-y-4">
          {/* <p className="text-xs uppercase tracking-[0.25em] text-neutral-500 dark:text-zinc-500">
            Teams
          </p> */}
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-zinc-50 sm:text-[30px] md:text-[34px]">
            See which teams will
            <br className="hidden sm:block" />
            <span className="sm:ml-1">actually miss their promises.</span>
          </h1>
          <p className="max-w-xl text-sm sm:text-base text-neutral-600 dark:text-zinc-300">
            Team-level view of delivery risk, confidence and active epics.
            High-risk teams bubble up so you know where to intervene first.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-neutral-700 dark:text-zinc-300 sm:gap-3">
            <Pill>
              <span className="font-mono text-neutral-900 dark:text-zinc-50">
                {counts.total || 0}
              </span>{" "}
              teams connected
            </Pill>
            <Pill>
              <span className="font-mono text-emerald-600 dark:text-emerald-300">
                {counts.healthy || 0}
              </span>{" "}
              healthy
            </Pill>
            <Pill>
              <span className="font-mono text-amber-600 dark:text-amber-300">
                {counts.atRisk || 0}
              </span>{" "}
              at risk
            </Pill>
            <Pill>
              <span className="font-mono text-red-600 dark:text-red-300">
                {counts.redZone || 0}
              </span>{" "}
              in red zone
            </Pill>
          </div>
        </section>

        {/* SUMMARY STRIP */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          <MetricTile label="Teams" value={counts.total || 0} tone="neutral" />
          <MetricTile
            label="Healthy"
            value={counts.healthy || 0}
            tone="green"
          />
          <MetricTile label="At risk" value={counts.atRisk || 0} tone="amber" />
          <MetricTile label="Red zone" value={counts.redZone || 0} tone="red" />
        </section>

        {/* CONTROLS */}
        <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="flex w-full items-center gap-2 md:max-w-xs">
            <input
              type="text"
              placeholder="Search teams…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
            />
          </div>

          {/* Filters + sort */}
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              options={RISK_FILTERS}
              value={riskFilter}
              onChange={setRiskFilter}
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-full border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-100 dark:focus:border-zinc-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* TEAM GRID */}
        <section>
          {visibleTeams.length === 0 ? (
            <Card className="border border-neutral-200 bg-white/90 px-4 py-6 text-sm text-neutral-600 shadow-sm dark:border-zinc-900 dark:bg-zinc-900/80 dark:text-zinc-300 sm:px-6 sm:py-8">
              No teams match the current filters.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visibleTeams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* Small shared components */

function MetricTile({ label, value, tone }) {
  let bar;
  if (tone === "green") bar = "bg-emerald-400";
  else if (tone === "amber") bar = "bg-amber-300";
  else if (tone === "red") bar = "bg-red-400";
  else bar = "bg-neutral-400 dark:bg-zinc-400";

  return (
    <Card className="border border-neutral-200 bg-white/90 px-4 py-4 shadow-sm dark:border-zinc-900 dark:bg-zinc-900/80">
      <span className="text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
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
    <div className="inline-flex items-center gap-0.5 rounded-full border border-neutral-300 bg-white p-0.5 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-3 py-1.5 font-medium transition ${
              active
                ? "bg-neutral-900 text-white dark:bg-zinc-100 dark:text-black"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
    <span className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200">
      {children}
    </span>
  );
}
