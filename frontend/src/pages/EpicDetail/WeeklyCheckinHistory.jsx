// src/pages/EpicDetail/WeeklyCheckinHistory.jsx
import { useMemo } from "react";
import {
  useWeeklyCheckins,
  useEpicOutcome,
} from "../../query/hooks/useWeeklyCheckins";

const ANSWER_LABELS = {
  on_track: "On track",
  slip_1_3: "Will slip 1–3 weeks",
  slip_3_plus: "Will slip >3 weeks",
};

const ANSWER_COLORS = {
  on_track: "text-emerald-400 border-emerald-500/40",
  slip_1_3: "text-amber-300 border-amber-400/40",
  slip_3_plus: "text-red-400 border-red-500/40",
};
function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function WeeklyCheckinHistory({ workspaceId, epicId }) {
  const {
    data: weekly = [],
    isLoading: isLoadingWeekly,
    isError: isErrorWeekly,
  } = useWeeklyCheckins(workspaceId, epicId);

  const {
    data: outcome,
    isLoading: isLoadingOutcome,
    isError: isErrorOutcome,
  } = useEpicOutcome(workspaceId, epicId);

  const entries = useMemo(() => {
    if (!Array.isArray(weekly)) return [];
    // assume API returns newest first; if not, sort by weekStart desc
    const sorted = [...weekly].sort(
      (a, b) => new Date(b.weekStart) - new Date(a.weekStart)
    );
    return sorted.slice(0, 6); // show up to 6 weeks for now
  }, [weekly]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-neutral-900 p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">
            Weekly truth
          </div>
          <div className="text-sm font-medium text-zinc-100">
            Lead answers over time
          </div>
        </div>

        {!isLoadingOutcome && !isErrorOutcome && outcome && (
          <div className="flex flex-col items-end text-right">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500">
              Final outcome
            </div>
            <div className="text-xs text-zinc-200">
              {outcome.status || "Unknown"}
            </div>
            {outcome.completedAt && (
              <div className="text-[11px] text-zinc-500">
                {formatDate(outcome.completedAt)}
              </div>
            )}
          </div>
        )}
      </div>

      {isLoadingWeekly && (
        <div className="text-xs text-zinc-400">Loading weekly history…</div>
      )}

      {isErrorWeekly && (
        <div className="text-xs text-red-400">
          Could not load weekly check-in history.
        </div>
      )}

      {!isLoadingWeekly && !isErrorWeekly && entries.length === 0 && (
        <div className="text-xs text-zinc-400">
          No weekly check-ins recorded yet. Once the lead starts answering,
          you&apos;ll see a history here.
        </div>
      )}

      {!isLoadingWeekly && !isErrorWeekly && entries.length > 0 && (
        <div className="flex flex-col gap-3">
          {entries.map((row) => {
            const label = ANSWER_LABELS[row.leadAnswer] || row.leadAnswer;
            const colorClass =
              ANSWER_COLORS[row.leadAnswer] || "text-zinc-200 border-zinc-600";

            return (
              <div
                key={`${row.weekStart}-${row._id}`}
                className="flex gap-3 text-xs"
              >
                <div className="mt-1 h-full w-px bg-zinc-800" />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-zinc-500">
                      Week of {formatDate(row.weekStart)}
                    </div>
                    <div
                      className={[
                        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        colorClass,
                      ].join(" ")}
                    >
                      {label}
                    </div>
                  </div>

                  {row.reason && (
                    <div className="rounded-xl bg-neutral-800/70 px-3 py-2 text-[11px] text-zinc-300">
                      {row.reason}
                    </div>
                  )}

                  {row.answeredAt && (
                    <div className="text-[10px] text-zinc-500">
                      Answered {formatDate(row.answeredAt)}
                      {row.answeredByName ? ` · ${row.answeredByName}` : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
