// src/pages/EpicDetail/SlipChainPanel.jsx
import Card from "../../components/ui/Card";

function formatOutcomeBand(outcomeBand) {
  if (!outcomeBand || outcomeBand === "on_time") return "On time";
  if (outcomeBand === "slip_1_3") return "Slipped 1–3 weeks";
  if (outcomeBand === "slip_3_plus") return "Slipped 3+ weeks";
  return outcomeBand;
}

export default function SlipChainPanel({ data, isLoading, error }) {
  if (isLoading) {
    return (
      <Card className="border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-xs text-neutral-500">Loading slip chain…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-xs text-red-400">
          Couldn’t load slip chain for this epic.
        </p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-xs text-neutral-500">
          No slip chain data yet. This epic either hasn’t slipped or we don’t
          have enough history.
        </p>
      </Card>
    );
  }

  const { epic, rootCauses = [] } = data;
  const outcomeLabel = formatOutcomeBand(epic?.outcomeBand);
  const slipDays = epic?.slipDays ?? 0;

  return (
    <Card className="border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Slip chain
          </p>
          <p className="mt-1 text-sm text-neutral-100">{epic?.title}</p>
          <p className="mt-1 text-xs text-neutral-400">
            {outcomeLabel}
            {slipDays > 0 ? ` · slipped ${slipDays} days` : null}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Primary driver
          </p>
          <p className="mt-1 text-xs text-neutral-200">
            {rootCauses[0]?.label || "None detected"}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          Root causes
        </p>

        {rootCauses.length === 0 ? (
          <p className="mt-2 text-xs text-neutral-500">
            No dominant root causes identified yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {rootCauses.map((rc, idx) => (
              <li
                key={`${rc.key || rc.label || "rc"}-${idx}`}
                className="flex items-start justify-between gap-3 rounded-xl bg-neutral-900/80 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium text-neutral-100">
                    {rc.label || rc.key}
                  </p>
                  {rc.reason && (
                    <p className="mt-1 text-[11px] text-neutral-500">
                      {rc.reason}
                    </p>
                  )}
                  {Array.isArray(rc.flags) && rc.flags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {rc.flags.map((f) => (
                        <span
                          key={f}
                          className="rounded-full border border-neutral-700 px-2 py-[1px] text-[10px] uppercase tracking-[0.14em] text-neutral-400"
                        >
                          {f.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-[11px] text-neutral-500">
                  {rc.ageDays != null && (
                    <p>
                      Age: {rc.ageDays} day{rc.ageDays === 1 ? "" : "s"}
                    </p>
                  )}
                  {rc.cycleTimeDays != null && (
                    <p>
                      Cycle: {rc.cycleTimeDays} day
                      {rc.cycleTimeDays === 1 ? "" : "s"}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
