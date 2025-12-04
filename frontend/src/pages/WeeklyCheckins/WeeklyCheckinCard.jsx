// src/pages/WeeklyCheckins/WeeklyCheckinCard.jsx
import { useState } from "react";
import { useSubmitWorkspaceWeeklyCheckin } from "../../query/hooks/useWeeklyCheckins";

const STATUS_LABELS = {
  on_track: "Yes, on track",
  slip_1_3: "Will slip 1–3 weeks",
  slip_3_plus: "Will slip >3 weeks",
};

const STATUS_DESCRIPTIONS = {
  on_track: "We expect to deliver within the current deadline.",
  slip_1_3: "We will likely miss by up to 3 weeks.",
  slip_3_plus: "We will likely miss by more than 3 weeks.",
};

export default function WeeklyCheckinCard({ epic }) {
  // epic shape from /weekly-checkins/pending:
  // { epicId, epicKey, title, state, url, lastStatus, lastWeekStart }

  const [selectedStatus, setSelectedStatus] = useState(null);
  const [reason, setReason] = useState("");
  const { mutate, isPending, isError } = useSubmitWorkspaceWeeklyCheckin();

  const handleSubmit = () => {
    if (!selectedStatus) return;

    mutate(
      {
        epicId: epic.epicId,
        status: selectedStatus,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          // After success, the epic disappears from list because
          // the pending query is invalidated and backend filters it out.
          setSelectedStatus(null);
          setReason("");
        },
      }
    );
  };

  const disabled = isPending || !selectedStatus;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-neutral-900 p-4 text-sm">
      {/* Epic header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-zinc-500">{epic.epicKey}</div>
          <div className="text-sm font-medium text-zinc-100">
            {epic.title || "(no title)"}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            Current state: {epic.state || "Unknown"}
          </div>
        </div>

        {epic.url && (
          <a
            href={epic.url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-400 hover:underline"
          >
            Open in Jira
          </a>
        )}
      </div>

      {/* Last week's answer, if any */}
      {epic.lastStatus && (
        <div className="rounded-xl bg-neutral-800/70 px-3 py-2 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-200">Last week: </span>
          {STATUS_LABELS[epic.lastStatus] || epic.lastStatus}
        </div>
      )}

      {/* Status buttons */}
      <div className="flex flex-col gap-2">
        {["on_track", "slip_1_3", "slip_3_plus"].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setSelectedStatus(status)}
            className={[
              "w-full rounded-xl border px-3 py-2 text-left text-xs transition",
              selectedStatus === status
                ? "border-zinc-500 bg-zinc-800 text-zinc-50"
                : "border-zinc-800 bg-neutral-900 text-zinc-300 hover:border-zinc-600",
            ].join(" ")}
          >
            <div className="font-medium">{STATUS_LABELS[status]}</div>
            <div className="text-[11px] text-zinc-500">
              {STATUS_DESCRIPTIONS[status]}
            </div>
          </button>
        ))}
      </div>

      {/* Optional reason */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-400">
          Optional one-line reason
        </label>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Example: Waiting on API from team X, code frozen; review backlog; no deploy in 2 weeks…"
          className="w-full rounded-xl border border-zinc-800 bg-neutral-900 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {/* Footer: actions + errors */}
      <div className="mt-1 flex items-center justify-between gap-3">
        {isError && (
          <span className="text-xs text-red-400">
            Failed to save. Try again.
          </span>
        )}
        {!isError && (
          <span className="text-[11px] text-zinc-500">
            Your answer trains KalMatrix's prediction model.
          </span>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          className={[
            "rounded-xl px-3 py-1.5 text-xs font-medium transition",
            disabled
              ? "bg-zinc-800 text-zinc-500"
              : "bg-zinc-100 text-zinc-900 hover:bg-white",
          ].join(" ")}
        >
          {isPending ? "Saving…" : "Save answer"}
        </button>
      </div>
    </div>
  );
}
