// src/components/weekly/WeeklyCheckinsHistoryList.jsx
import React from "react";
import Card from "../ui/Card";

const STATUS_LABELS = {
  on_track: "On track",
  slip_1_3: "Slip 1–3 weeks",
  slip_3_plus: "Slip 3+ weeks",
};

export default function WeeklyCheckinsHistoryList({ items, epicLookup }) {
  if (!items || items.length === 0) {
    return (
      <div className="py-4 text-xs text-neutral-500 dark:text-zinc-500">
        No history yet. Once you submit weekly answers, they’ll appear here.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <HistoryRow key={item.id} item={item} epicLookup={epicLookup} />
      ))}
    </div>
  );
}

function HistoryRow({ item, epicLookup }) {
  // try lookup from pending epics, but only as a fallback
  const epicMeta = epicLookup ? epicLookup(item.epicId) : null;

  const title = item.epicTitle || epicMeta?.title || "Unknown epic";

  const key =
    item.epicKey || epicMeta?.key || (item.epicId ? item.epicId.slice(-6) : "");

  const statusLabel = STATUS_LABELS[item.status] || item.status || "—";

  const weekText = formatWeek(item.weekStart);
  const submittedAt = formatDateTime(item.createdAt);

  const tone = statusTone(item.status);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-800 shadow-sm dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-200 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        {/* Left: epic + week + comment */}
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-5 w-0.5 rounded-full bg-neutral-300 dark:bg-zinc-600" />
            <div>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {key && (
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-500 dark:text-zinc-500">
                    {key}
                  </span>
                )}
                <span className="text-[13px] font-medium text-neutral-900 dark:text-zinc-50">
                  {title}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-zinc-500">
                {weekText}
                {submittedAt ? ` · Submitted ${submittedAt}` : ""}
              </p>
            </div>
          </div>

          {item.comment && (
            <p className="mt-1 line-clamp-2 pl-3 text-[11px] text-neutral-600 dark:text-zinc-400">
              “{item.comment}”
            </p>
          )}
        </div>

        {/* Right: status pill */}
        <div className="flex items-center md:items-start">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium ${tone.bg} ${tone.border} ${tone.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---- helpers ---- */

function statusTone(status) {
  if (status === "on_track") {
    return {
      bg: "bg-emerald-500/8 dark:bg-emerald-500/10",
      border: "border-emerald-500/40",
      text: "text-emerald-700 dark:text-emerald-100",
      dot: "bg-emerald-500",
    };
  }
  if (status === "slip_1_3") {
    return {
      bg: "bg-amber-500/8 dark:bg-amber-500/10",
      border: "border-amber-500/40",
      text: "text-amber-700 dark:text-amber-100",
      dot: "bg-amber-400",
    };
  }
  if (status === "slip_3_plus") {
    return {
      bg: "bg-red-500/8 dark:bg-red-500/10",
      border: "border-red-500/40",
      text: "text-red-700 dark:text-red-100",
      dot: "bg-red-500",
    };
  }
  return {
    bg: "bg-neutral-100 dark:bg-zinc-900",
    border: "border-neutral-300 dark:border-zinc-700",
    text: "text-neutral-700 dark:text-zinc-200",
    dot: "bg-neutral-400",
  };
}

function formatWeek(weekStart) {
  if (!weekStart) return "Unknown week";

  try {
    const d = new Date(weekStart);
    if (isNaN(d.getTime())) return "Unknown week";

    return `Week of ${d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  } catch {
    return "Unknown week";
  }
}

function formatDateTime(value) {
  if (!value) return "";

  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";

    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "";
  }
}
