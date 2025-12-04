// src/pages/DeliveryRadar/SignalsDrawer.jsx
export default function SignalsDrawer({ epics, selectedEpicId, onClose }) {
  if (!selectedEpicId) return null;

  const epic = epics.find((e) => e.id === selectedEpicId);
  if (!epic) return null;
  console.log("eee", epics);

  const raw = epic.raw || {};
  const team = epic.team || null;
  const teamMetrics = team?.metrics || null;

  const teamLabel =
    typeof raw.team === "string"
      ? raw.team
      : typeof team?.name === "string"
      ? team.name
      : typeof team?.key === "string"
      ? team.key
      : null;

  const risk = typeof epic.risk === "number" ? epic.risk : 0;
  const riskPercent = Math.round(risk * 100);
  const band = classifyRisk(risk);
  const bandLabel =
    band === "red_zone"
      ? "Red zone"
      : band === "at_risk"
      ? "At risk"
      : "Healthy";

  const windowLabel = epic.window || raw.window || "next 2–6 weeks";

  const riskSummary = epic.riskSummary || raw.riskSummary || null;
  const trendDirection =
    riskSummary?.trendDirection || raw.trendDirection || null;
  const trendLabel = getTrendLabel(trendDirection);

  const recovery = epic.recovery || raw.recovery || null;
  const hasRecovery =
    recovery &&
    recovery.slipType &&
    recovery.slipType !== "none" &&
    Array.isArray(recovery.actions) &&
    recovery.actions.length > 0;

  const startDate = formatShortDate(
    epic.startDate || raw.startedAt || raw.createdAt
  );
  const dueDate = formatShortDate(
    epic.dueDate || raw.targetDelivery || raw.deadline
  );

  const assignees =
    epic.assignees && epic.assignees.length > 0
      ? epic.assignees
          .map((a) => a.displayName || a.email || a.emailAddress)
          .filter(Boolean)
          .join(", ")
      : null;

  const signals = Array.isArray(epic.signals) ? epic.signals : [];

  // Prefer top-level reasons (what backend sends now). Fallback to signals.
  const rawReasons =
    Array.isArray(epic.reasons) && epic.reasons.length > 0
      ? epic.reasons
      : Array.isArray(raw.reasons) && raw.reasons.length > 0
      ? raw.reasons
      : signals;

  // HARD GUARD: never render raw objects as children, always stringify
  const reasons = (Array.isArray(rawReasons) ? rawReasons : []).map((r) =>
    typeof r === "string" ? r : JSON.stringify(r)
  );

  const primarySignal = signals[0];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="h-full w-full max-w-xl border-l border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Epic overview
            </div>
            <h2 className="text-xl font-semibold leading-snug text-zinc-50">
              {epic.epic}
            </h2>
            <div className="text-xs text-zinc-400">
              <span className="uppercase tracking-wide text-zinc-500">ID:</span>{" "}
              <span className="text-zinc-200">{raw.key}</span>
              {teamLabel && (
                <>
                  {" "}
                  · <span className="uppercase tracking-wide">Team:</span>{" "}
                  <span className="text-zinc-200">{teamLabel}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <RiskPill band={band} riskPercent={riskPercent} />

            <button
              onClick={onClose}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800"
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex h-[calc(100%-72px)] flex-col gap-6 overflow-y-auto px-6 py-5">
          {/* Delivery snapshot */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Delivery snapshot
            </div>

            <p className="mt-2 text-sm text-zinc-100">
              This epic is currently{" "}
              <span className="font-semibold">{bandLabel.toLowerCase()}</span>{" "}
              with a{" "}
              <span className="font-semibold">
                {riskPercent}% risk of delay
              </span>{" "}
              in the {windowLabel}.
            </p>

            {primarySignal && (
              <p className="mt-2 text-xs text-zinc-400">
                Headline signal:{" "}
                <span className="text-zinc-200">{primarySignal}</span>
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-300">
              <Detail label="Start" value={startDate || "Not set"} />
              <Detail label="Target delivery" value={dueDate || "Not set"} />
              <Detail label="Band" value={bandLabel} />
              <Detail
                label="Window"
                value={
                  windowLabel.charAt(0).toUpperCase() + windowLabel.slice(1)
                }
              />
              <Detail label="Trend" value={trendLabel} />
              <Detail
                label="Assignees"
                value={assignees || "Unassigned"}
                fullWidth
              />
            </div>
          </section>
          {/* Signals driving this risk */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Signals driving this risk
            </h3>

            {reasons && reasons.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-[2px] h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span>{reason}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">
                No strong risk signals yet. As we see more activity in Jira,
                this panel will explain why the risk score moves.
              </p>
            )}
          </section>
          {/* Recovery plan */}
          {hasRecovery && (
            <section className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                Recovery plan
              </h3>

              <p className="mt-1 text-xs text-zinc-400">
                {formatSlipTypeLabel(recovery.slipType)} ·{" "}
                <span className={severityClass(recovery.severity)}>
                  {formatSeverityLabel(recovery.severity)}
                </span>
                {recovery.recoveryETA?.label && (
                  <> · Expected recovery {recovery.recoveryETA.label}</>
                )}
              </p>

              <ul className="mt-3 space-y-2 text-xs text-zinc-200">
                {recovery.actions.slice(0, 4).map((action) => (
                  <li key={action.id} className="flex gap-2">
                    <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <div>
                      <div className="font-medium">{action.label}</div>
                      <div className="text-[11px] text-zinc-500">
                        {action.description}
                      </div>
                      {action.owner && (
                        <div className="mt-0.5 text-[11px] text-zinc-500">
                          Owner: {action.owner.toUpperCase()}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Team baseline – Moat 3 */}
          {team && teamMetrics && <TeamBaselinePanel team={team} />}
          {console.log("team data", team, teamMetrics)}

          {/* Activity summary */}
          <section className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              How to use this card
            </h3>
            <p className="mt-2 text-xs text-zinc-400">
              Use this view in your weekly check-in: start with the highest-risk
              epics, confirm owners and dates, and agree on the next two actions
              that reduce slippage risk.
            </p>
          </section>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

/* Team baseline panel */

function TeamBaselinePanel({ team }) {
  if (!team || typeof team !== "object") return null;

  const m = team.metrics || {};
  const hasData =
    m.avgCycleTimeDays != null ||
    m.throughputLast7Days != null ||
    m.throughputBaselinePerWeek != null;

  if (!hasData) return null;

  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Team baseline
          </p>
          <p className="mt-0.5 text-sm font-medium text-zinc-100">
            {team.name || team.key}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Avg cycle time
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-100">
            {m.avgCycleTimeDays != null ? `${m.avgCycleTimeDays}d` : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Closed last 7d
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-100">
            {m.throughputLast7Days != null ? m.throughputLast7Days : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Baseline / week
          </p>
          <p className="mt-0.5 font-mono text-xs text-zinc-100">
            {m.throughputBaselinePerWeek != null
              ? m.throughputBaselinePerWeek
              : "—"}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-zinc-500">
        This epic rides on this team&rsquo;s normal speed. If their current week
        is far below baseline, risk will stay high even with a recovery plan.
      </p>
    </div>
  );
}

/* Helpers */

function classifyRisk(risk) {
  const p = Math.round((risk || 0) * 100);
  if (p >= 70) return "red_zone";
  if (p >= 50) return "at_risk";
  return "healthy";
}

function formatShortDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  }); // e.g. 23 Nov
}

function RiskPill({ band, riskPercent }) {
  let bg, text;
  if (band === "red_zone") {
    bg = "bg-red-500";
    text = "text-black";
  } else if (band === "at_risk") {
    bg = "bg-amber-400";
    text = "text-black";
  } else {
    bg = "bg-emerald-400";
    text = "text-black";
  }

  const label =
    band === "red_zone"
      ? "Red zone"
      : band === "at_risk"
      ? "At risk"
      : "Healthy";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${bg} ${text}`}
    >
      {riskPercent}% · {label}
    </span>
  );
}

function Detail({ label, value, fullWidth }) {
  return (
    <div className={fullWidth ? "col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 text-xs text-zinc-100">{value}</div>
    </div>
  );
}

function getTrendLabel(trendDirection) {
  if (trendDirection === "worsening") return "Worsening";
  if (trendDirection === "improving") return "Improving";
  return "Stable / No clear trend";
}

function formatSlipTypeLabel(slipType) {
  switch (slipType) {
    case "scope_creep":
      return "Scope creep";
    case "dependency_blocked":
      return "Dependency blocked";
    case "stagnant_work":
      return "Stagnant work";
    case "lead_uncertainty":
      return "Lead uncertainty";
    case "lead_misalignment":
      return "Lead misalignment";
    case "no_plan":
      return "No concrete plan";
    case "generic_high_risk":
      return "High risk (uncategorised)";
    default:
      return "Risky epic";
  }
}

function formatSeverityLabel(severity) {
  switch (severity) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "moderate":
      return "Moderate";
    case "low":
      return "Low";
    default:
      return "None";
  }
}

function severityClass(severity) {
  switch (severity) {
    case "critical":
      return "text-red-400";
    case "high":
      return "text-orange-400";
    case "moderate":
      return "text-amber-300";
    case "low":
      return "text-emerald-300";
    default:
      return "text-zinc-400";
  }
}
