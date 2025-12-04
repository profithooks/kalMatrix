// src/pages/Teams/TeamDetailPage.jsx
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import RiskBadge from "../../components/ui/RiskBadge";
import Card from "../../components/ui/Card";
import { useTeamsRiskData } from "../../query/hooks/useTeamsRiskData";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function buildConfidenceSeries(confidence) {
  return (confidence || []).map((v, idx) => ({
    week: `W${idx + 1}`,
    value: Math.round((v || 0) * 100), // 0–1 -> %
  }));
}

function classifyTeamBand(riskPercent) {
  if (riskPercent >= 65) return "red_zone";
  if (riskPercent >= 50) return "at_risk";
  return "healthy";
}

function getTeamName(team) {
  const rawName = team.name;
  if (typeof rawName === "string") return rawName;
  if (rawName && typeof rawName === "object")
    return rawName.name || rawName.key || team.id;
  return team.id || "Unassigned";
}

// window is already a human-readable string in backend response
function formatEpicWindow(epic) {
  if (epic.window && typeof epic.window === "string") return epic.window;

  if (epic.predictionWindowWeeks) {
    const w = epic.predictionWindowWeeks;
    if (typeof w === "string") return w;
    if (typeof w.min === "number" && typeof w.max === "number") {
      return `${w.min}–${w.max} weeks`;
    }
  }

  return "Unknown";
}

export default function TeamDetailPage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useTeamsRiskData();
  const teams = data?.teams || [];
  const team = teams.find((t) => String(t.id) === String(id));

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50 text-xs text-neutral-500 dark:bg-[#050506] dark:text-zinc-400">
        Loading team data…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50 text-xs text-red-500 dark:bg-[#050506] dark:text-red-400">
        Failed to load team. Please refresh.
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50 text-sm text-neutral-500 dark:bg-[#050506] dark:text-zinc-400">
        Team not found.
        <Link
          to="/teams"
          className="ml-1 text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          Back to teams
        </Link>
      </div>
    );
  }

  const teamName = getTeamName(team);

  const teamRisk =
    typeof team.teamRisk === "number"
      ? team.teamRisk
      : typeof team.avgRiskScore === "number"
      ? team.avgRiskScore
      : 0;

  const riskPercent = Math.round(teamRisk); // 0–100

  const band = classifyTeamBand(riskPercent);
  const bandLabel =
    band === "red_zone"
      ? "Red zone"
      : band === "at_risk"
      ? "At risk"
      : "Healthy";

  // Use backend `activeEpics`; fall back to `epics` if needed
  const activeEpics =
    (Array.isArray(team.activeEpics) && team.activeEpics.length > 0
      ? team.activeEpics
      : team.epics) || [];

  const avgEpicRisk =
    activeEpics.length > 0
      ? Math.round(
          activeEpics.reduce(
            (acc, e) =>
              acc +
              (typeof e.riskScore === "number"
                ? e.riskScore
                : typeof e.probability === "number"
                ? e.probability
                : 0),
            0
          ) / activeEpics.length
        )
      : 0;

  const confidenceData = buildConfidenceSeries(team.confidence);
  const sortedEpics = [...activeEpics].sort((a, b) => {
    const aHasWindow = a.window && a.window !== "Unknown";
    const bHasWindow = b.window && b.window !== "Unknown";

    // Grouping: windowed first
    if (aHasWindow && !bHasWindow) return -1;
    if (!aHasWindow && bHasWindow) return 1;

    // If both have or both don't have window → sort by risk
    return (b.riskScore || 0) - (a.riskScore || 0);
  });

  return (
    <div className="min-h-full w-full bg-zinc-50 text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
        {/* HEADER */}
        <header className="flex items-start gap-4">
          <Link
            to="/teams"
            className="mt-1 rounded-full border border-neutral-200 bg-white/90 p-2 text-neutral-500 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-black dark:hover:text-zinc-100"
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="flex flex-1 flex-col gap-2">
            <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500 dark:text-zinc-500">
              Team radar
            </p>
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-zinc-50 sm:text-[30px] md:text-[34px]">
              {teamName}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-zinc-400">
              <span className="font-mono text-neutral-900 dark:text-zinc-100">
                {activeEpics.length}
              </span>{" "}
              active epic{activeEpics.length === 1 ? "" : "s"} on this radar.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full border border-neutral-300 bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-700 shadow-sm dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-200">
              {bandLabel}
            </span>
            <RiskBadge risk={riskPercent} />
          </div>
        </header>

        {/* TOP SUMMARY STRIP */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border border-neutral-200 bg-white/90 px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-black/80">
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
              Team risk
            </p>
            <p
              className={`mt-2 text-3xl font-semibold ${
                band === "red_zone"
                  ? "text-red-500 dark:text-red-400"
                  : band === "at_risk"
                  ? "text-amber-500 dark:text-amber-300"
                  : "text-emerald-600 dark:text-emerald-300"
              }`}
            >
              {riskPercent}%
            </p>
            <p className="mt-1 text-[11px] text-neutral-600 dark:text-zinc-500">
              Aggregated risk across all active epics and signals.
            </p>
          </Card>

          <Card className="border border-neutral-200 bg-white/90 px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-black/80">
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
              Average epic risk
            </p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900 dark:text-zinc-100">
              {avgEpicRisk}%
            </p>
            <p className="mt-1 text-[11px] text-neutral-600 dark:text-zinc-500">
              Mean probability across all tracked epics for this team.
            </p>
          </Card>

          <Card className="border border-neutral-200 bg-white/90 px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-black/80">
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
              Active epics
            </p>
            <p className="mt-2 text-3xl font-semibold text-neutral-900 dark:text-zinc-100">
              {activeEpics.length}
            </p>
            <p className="mt-1 text-[11px] text-neutral-600 dark:text-zinc-500">
              Ingested from Jira for this workspace.
            </p>
          </Card>
        </section>

        {/* CONFIDENCE CHART */}
        <section>
          <Card className="border border-neutral-200 bg-white/90 px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-black/80">
            <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
              Prediction confidence (recent runs)
            </p>
            {confidenceData.length === 0 ? (
              <p className="text-xs text-neutral-600 dark:text-zinc-500">
                Not enough history yet. Run predictions a few times to see this
                chart populate.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={confidenceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="week" stroke="#71717a" fontSize={11} />
                    <YAxis
                      stroke="#71717a"
                      fontSize={11}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#27272a",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#e5e7eb" }}
                      itemStyle={{ color: "#22c55e" }}
                      formatter={(value) => [`${value}%`, "Confidence"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </section>

        {/* EPICS TABLE */}
        <section>
          <Card className="border border-neutral-200 bg-white/90 px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-black/80">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
                Active epics for {teamName}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-zinc-800">
              <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-zinc-900">
                <thead className="bg-neutral-50 dark:bg-zinc-950/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-zinc-500">
                      Epic
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-zinc-500">
                      Risk
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-zinc-500">
                      Window
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white dark:divide-zinc-900 dark:bg-black">
                  {activeEpics.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-4 text-center text-xs text-neutral-500 dark:text-zinc-500"
                      >
                        No active epics are currently linked to this team.
                      </td>
                    </tr>
                  )}

                  {sortedEpics?.map((e) => {
                    const epicRiskPercent = Math.round(
                      typeof e.riskScore === "number"
                        ? e.riskScore
                        : typeof e.probability === "number"
                        ? e.probability
                        : 0
                    );

                    return (
                      <tr
                        key={e.id || e.key}
                        className="hover:bg-neutral-50 dark:hover:bg-zinc-900/60"
                      >
                        <td className="px-4 py-3 text-sm text-neutral-800 dark:text-zinc-200">
                          {e.name || e.key || "Untitled epic"}
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge risk={epicRiskPercent} />
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-600 dark:text-zinc-300">
                          {formatEpicWindow(e)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
