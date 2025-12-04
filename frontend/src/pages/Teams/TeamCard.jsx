// src/pages/Teams/TeamCard.jsx
import { Link } from "react-router-dom";
import RiskBadge from "../../components/ui/RiskBadge";

export default function TeamCard({ team }) {
  // Backend sends 0–100
  const riskPercent =
    typeof team.teamRisk === "number"
      ? Math.round(team.teamRisk)
      : typeof team.avgRiskScore === "number"
      ? Math.round(team.avgRiskScore)
      : 0;

  // team.name can be a string OR an object { key, name, metrics }
  const rawName = team.name;
  const teamName =
    typeof rawName === "string"
      ? rawName
      : rawName && typeof rawName === "object"
      ? rawName.name || rawName.key || team.id
      : team.id || "Unassigned";

  const activeEpicCount =
    typeof team.epicCount === "number"
      ? team.epicCount
      : team.activeEpics?.length ?? 0;

  return (
    <Link
      to={`/team/${team.id}`}
      className="block rounded-2xl border border-neutral-200 bg-white p-5 text-sm shadow-sm transition hover:border-neutral-400/70 hover:bg-neutral-50 dark:border-zinc-800 dark:bg-black/80 dark:hover:border-zinc-600 dark:hover:bg-black"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-neutral-900 dark:text-white">
            {teamName}
          </h2>
          {Array.isArray(team.members) && team.members.length > 0 && (
            <p className="mt-1 line-clamp-2 text-[11px] text-neutral-500 dark:text-zinc-500">
              Members: {team.members.join(", ")}
            </p>
          )}
        </div>
        {/* RiskBadge expects 0–100 */}
        <RiskBadge risk={riskPercent} />
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-neutral-600 dark:text-zinc-400">
        <span>
          Active epics:{" "}
          <span className="font-mono text-neutral-900 dark:text-zinc-100">
            {activeEpicCount}
          </span>
        </span>
        <span>
          Team risk:{" "}
          <span
            className={
              riskPercent >= 65
                ? "font-mono text-red-500 dark:text-red-400"
                : riskPercent >= 50
                ? "font-mono text-amber-500 dark:text-amber-300"
                : "font-mono text-emerald-600 dark:text-emerald-400"
            }
          >
            {riskPercent}%
          </span>
        </span>
      </div>

      {/* confidence is 0–1 → convert to % for mini heatmap */}
      {Array.isArray(team.confidence) && team.confidence.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] text-neutral-500 dark:text-zinc-500">
            Prediction confidence (last 4 weeks)
          </p>
          <div className="mt-2 flex gap-1">
            {team.confidence.map((value, idx) => {
              const p = Math.round((value || 0) * 100);
              let bg = "bg-neutral-300 dark:bg-zinc-700";
              if (p >= 75) bg = "bg-emerald-500/80";
              else if (p >= 55) bg = "bg-amber-400/80";
              else bg = "bg-red-500/80";

              return (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-sm ${bg}`}
                  title={`Week ${idx + 1}: ${p}%`}
                />
              );
            })}
          </div>
        </div>
      )}
    </Link>
  );
}
