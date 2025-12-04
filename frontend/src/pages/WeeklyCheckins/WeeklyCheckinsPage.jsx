// src/pages/WeeklyCheckins/WeeklyCheckinsPage.jsx
import React, { useState } from "react";
import { usePendingCheckins } from "../../query/hooks/usePendingCheckins";
import { useSubmitCheckin } from "../../query/mutations/useSubmitCheckin";
import Card from "../../components/ui/Card";
import { useWeeklyCheckinHistory } from "../../query/hooks/useWeeklyCheckinHistory";
import WeeklyCheckinsHistoryList from "../../components/weekly/WeeklyCheckinsHistoryList";
import { useWeeklyAccountabilitySummary } from "../../query/hooks/useWeeklyAccountabilitySummary";
import { useAuthStore } from "../../store/authStore";
import { useWorkspaceAccountability } from "../../query/hooks/useWorkspaceAccountability";

const STATUS_LABELS = {
  on_track: "On track",
  slip_1_3: "Slip 1–3 weeks",
  slip_3_plus: "Slip 3+ weeks",
};

export default function WeeklyCheckinsPage() {
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "history"

  const workspaceId = useAuthStore((s) => s.workspaceId);
  const { data, isLoading, isError } = usePendingCheckins();
  const submitCheckin = useSubmitCheckin();

  const pending = data?.pending || [];
  const pendingCount = pending.length;

  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
  } = useWeeklyCheckinHistory(workspaceId, { enabled: !!workspaceId });

  const {
    data: accountability,
    isLoading: accLoading,
    isError: accError,
  } = useWorkspaceAccountability();

  const { data: accountabilityData } = useWeeklyAccountabilitySummary({
    weeks: 8,
  });

  const historyItems = historyData?.items || [];

  const epicLookup = (epicId) => {
    if (!pending || pending.length === 0) return undefined;

    const epic = pending.find((e) => e.epicId === epicId || e.id === epicId);
    if (!epic) return undefined;

    const key = epic.key || epic.epicKey || "";
    const title = epic.epicTitle || epic.title || epic.key || "Untitled epic";

    return { key, title };
  };

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50 text-xs text-neutral-500 dark:bg-[#050506] dark:text-zinc-400">
        Loading weekly check-ins…
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-zinc-50 text-xs text-red-500 dark:bg-[#050506] dark:text-red-400">
        Failed to load weekly check-ins. Try again.
      </div>
    );
  }

  // Top performer for accountability pill
  const topPerformer =
    accountabilityData &&
    Array.isArray(accountabilityData.users) &&
    accountabilityData.users.length > 0
      ? accountabilityData.users[0]
      : null;

  const topOnTimeRate = topPerformer?.onTimeRate ?? null;
  const topOnTimePercent =
    topOnTimeRate != null ? Math.round(topOnTimeRate * 100) : null;

  const topNameRaw =
    topPerformer?.displayName ||
    (topPerformer?.email ? topPerformer.email.split("@")[0] : null) ||
    null;

  const topDotColor =
    topOnTimeRate != null && topOnTimeRate >= 0.8
      ? "bg-emerald-400"
      : "bg-amber-400";

  return (
    <div className="min-h-full w-full bg-zinc-50 text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
        {/* HERO */}
        <section className="space-y-4">
          {/* <p className="text-xs uppercase tracking-[0.25em] text-neutral-500 dark:text-zinc-500">
            Weekly check-ins
          </p> */}
          <h1 className="text-[28px] font-semibold leading-tight text-neutral-900 dark:text-zinc-50 sm:text-[30px] md:text-[34px]">
            One 10-second answer
            <br className="hidden sm:block" />
            <span className="sm:ml-1">per epic, once a week.</span>
          </h1>
          <p className="max-w-xl text-sm sm:text-base text-neutral-600 dark:text-zinc-300">
            These check-ins are the human signal the radar trusts the most.
            Answer honestly. KalMatrix does the rest.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-neutral-700 dark:text-zinc-300 sm:gap-3">
            <Pill>
              {pendingCount === 0 ? (
                <>
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  All caught up for this week
                </>
              ) : (
                <>
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span className="font-mono text-neutral-900 dark:text-zinc-50">
                    {pendingCount}
                  </span>{" "}
                  check-in{pendingCount > 1 ? "s" : ""} waiting on you
                </>
              )}
            </Pill>

            {topPerformer && topOnTimePercent !== null && (
              <Pill>
                <span
                  className={`mr-1 h-1.5 w-1.5 rounded-full ${topDotColor}`}
                />
                <span className="mr-1 font-medium text-neutral-900 dark:text-zinc-50">
                  Top performer:
                </span>
                <span className="mr-1 font-medium text-neutral-900 dark:text-zinc-50">
                  {topNameRaw || "Lead"}
                </span>
                <span className="font-mono text-neutral-900 dark:text-zinc-50">
                  {topOnTimePercent}%
                </span>{" "}
                on-time check-ins
              </Pill>
            )}
          </div>
        </section>

        {/* CHECK-IN DISCIPLINE SUMMARY */}
        <section className="mb-2">
          <Card className="border border-zinc-200 bg-white/90 px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-5 sm:py-5">
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
              Check-in discipline
            </p>

            {accLoading && (
              <p className="mt-2 text-xs text-neutral-600 dark:text-zinc-400">
                Loading weekly accountability…
              </p>
            )}

            {accError && (
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                Failed to load accountability summary.
              </p>
            )}

            {!accLoading && !accError && !accountability && (
              <p className="mt-2 text-xs text-neutral-600 dark:text-zinc-400">
                No check-in history yet. Once the team starts submitting weekly
                answers, discipline metrics will show up here.
              </p>
            )}

            {!accLoading && !accError && accountability && (
              <div className="mt-4 space-y-4">
                {/* Top summary bar */}
                <div className="grid grid-cols-3 gap-3 text-sm text-neutral-700 dark:text-zinc-200">
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-zinc-500">
                      On time
                    </p>
                    <p className="font-mono text-xl text-emerald-600 dark:text-emerald-300">
                      {accountability.summary?.onTimeCount ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-zinc-500">
                      Late
                    </p>
                    <p className="font-mono text-xl text-amber-600 dark:text-amber-300">
                      {accountability.summary?.lateCount ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 dark:text-zinc-500">
                      Missed
                    </p>
                    <p className="font-mono text-xl text-red-600 dark:text-red-300">
                      {accountability.summary?.missedCount ?? 0}
                    </p>
                  </div>
                </div>

                {/* Per-person breakdown */}
                {Array.isArray(accountability.users) &&
                  accountability.users.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-neutral-700 dark:text-zinc-200">
                        By person
                      </p>
                      <div className="space-y-1.5">
                        {accountability.users.map((u) => (
                          <div
                            key={u.userId}
                            className="flex items-center justify-between rounded-xl bg-neutral-100/80 px-3 py-2 text-xs text-neutral-700 dark:bg-zinc-900/70 dark:text-zinc-200"
                          >
                            <div>
                              <p className="text-sm font-medium text-neutral-900 dark:text-zinc-50">
                                {u.name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-zinc-400">
                                On time:{" "}
                                <span className="font-mono text-emerald-600 dark:text-emerald-300">
                                  {u.onTime ?? 0}
                                </span>{" "}
                                · Late:{" "}
                                <span className="font-mono text-amber-600 dark:text-amber-300">
                                  {u.late ?? 0}
                                </span>{" "}
                                · Missed:{" "}
                                <span className="font-mono text-red-600 dark:text-red-300">
                                  {u.missed ?? 0}
                                </span>
                              </p>
                            </div>
                            <div>
                              <span className="inline-flex items-center rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-50 dark:bg-zinc-100 dark:text-zinc-900">
                                Streak {u.currentStreak ?? 0}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </Card>
        </section>

        {/* TABS */}
        <section className="space-y-4">
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              className={
                "px-3 py-2 text-xs font-medium sm:px-4 " +
                (activeTab === "pending"
                  ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-zinc-50 dark:text-zinc-50"
                  : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-800 dark:text-zinc-500 dark:hover:text-zinc-200")
              }
              onClick={() => setActiveTab("pending")}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              className={
                "px-3 py-2 text-xs font-medium sm:px-4 " +
                (activeTab === "history"
                  ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-zinc-50 dark:text-zinc-50"
                  : "border-b-2 border-transparent text-neutral-500 hover:text-neutral-800 dark:text-zinc-500 dark:hover:text-zinc-200")
              }
              onClick={() => setActiveTab("history")}
            >
              History
              {historyItems.length > 0 ? ` (${historyItems.length})` : ""}
            </button>
          </div>

          {/* PENDING TAB */}
          {activeTab === "pending" && (
            <>
              {pendingCount === 0 ? (
                <Card className="border border-zinc-200 bg-white/90 px-4 py-6 text-xs text-neutral-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 sm:px-6 sm:py-8">
                  <p className="text-base font-medium text-neutral-900 dark:text-zinc-50">
                    Nothing to report.
                  </p>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-zinc-400">
                    Every active epic already has a check-in for this week. The
                    radar is using your latest answers.
                  </p>
                </Card>
              ) : (
                <>
                  <div className="flex flex-col gap-1 text-xs text-neutral-500 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      Answer for each epic once. This screen is meant to be
                      fast, not perfect.
                    </span>
                    <span className="font-mono text-neutral-700 dark:text-zinc-400">
                      {pendingCount} active epic
                      {pendingCount > 1 ? "s" : ""} waiting for this week’s
                      answer.
                    </span>
                  </div>

                  <div className="space-y-3">
                    {pending.map((epic) => (
                      <EpicCheckinCard
                        key={epic.epicId}
                        epic={epic}
                        submitCheckin={submitCheckin}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <Card className="border border-zinc-200 bg-white/90 px-4 py-5 text-xs text-neutral-600 shadow-sm dark:border-zinc-900 dark:bg-zinc-900/80 dark:text-zinc-300 sm:px-6 sm:py-6">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
                    History
                  </p>
                  <p className="mt-1 text-xs text-neutral-600 dark:text-zinc-400">
                    All weekly answers you’ve submitted. Use this to explain why
                    the radar changed last week.
                  </p>
                </div>
              </div>

              {isHistoryLoading && (
                <div className="py-4 text-xs text-neutral-500 dark:text-zinc-500">
                  Loading history…
                </div>
              )}

              {isHistoryError && !isHistoryLoading && (
                <div className="py-4 text-xs text-red-500 dark:text-red-400">
                  Failed to load history. Try reloading the page.
                </div>
              )}

              {!isHistoryLoading && !isHistoryError && (
                <WeeklyCheckinsHistoryList
                  items={historyItems}
                  epicLookup={epicLookup}
                />
              )}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---- components ---- */

function EpicCheckinCard({ epic, submitCheckin }) {
  const title = epic.epicTitle || epic.key || "Untitled epic";
  const team = epic.team || epic.projectKey || "No team";
  const eta =
    epic.targetDelivery || epic.dueDate || epic.eta || epic.targetDate || null;

  const lastAnswer = epic.lastAnswer;

  const savingStatus = submitCheckin.isPending ? submitCheckin.variables : null;

  return (
    <Card className="flex flex-col items-stretch justify-between gap-3 border border-zinc-200 bg-white/90 px-4 py-4 text-xs shadow-sm dark:border-zinc-900 dark:bg-zinc-900/80 dark:text-zinc-300 sm:flex-row sm:items-center sm:px-5 sm:py-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="h-5 w-0.5 rounded-full bg-neutral-300 dark:bg-zinc-600" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-neutral-900 dark:text-zinc-50">
              {title}
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-zinc-500">
              {team}
              {eta ? ` · ${formatEta(eta)}` : ""}
            </span>
          </div>
        </div>
        {lastAnswer && (
          <p className="pl-3 text-[11px] text-neutral-500 dark:text-zinc-500">
            Last week: {STATUS_LABELS[lastAnswer] || lastAnswer}
          </p>
        )}
      </div>

      <div className="mt-1 flex flex-col items-stretch gap-2 md:mt-0 md:flex-row md:items-center">
        <CheckinButton
          epicId={epic.epicId}
          status="on_track"
          submit={submitCheckin}
          savingStatus={savingStatus}
        />
        <CheckinButton
          epicId={epic.epicId}
          status="slip_1_3"
          submit={submitCheckin}
          savingStatus={savingStatus}
        />
        <CheckinButton
          epicId={epic.epicId}
          status="slip_3_plus"
          submit={submitCheckin}
          savingStatus={savingStatus}
        />
      </div>
    </Card>
  );
}

function CheckinButton({ epicId, status, submit, savingStatus }) {
  const label = STATUS_LABELS[status] || status.replace("_", " ");
  const isLoading =
    savingStatus && submit.variables && submit.variables.status === status;

  const { bg, border, text, dot, hover } = buttonTone(status);

  return (
    <button
      type="button"
      onClick={() => submit.mutate({ epicId, status })}
      disabled={isLoading}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition sm:w-auto sm:min-w-[130px] ${bg} ${border} ${text} ${hover} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {isLoading ? "Saving…" : label}
    </button>
  );
}

/* ---- helpers ---- */

function buttonTone(status) {
  if (status === "on_track") {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/10",
      border: "border-emerald-500/40",
      text: "text-emerald-700 dark:text-emerald-100",
      dot: "bg-emerald-500",
      hover: "hover:bg-emerald-500/15 dark:hover:bg-emerald-500/20",
    };
  }
  if (status === "slip_1_3") {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-500/10",
      border: "border-amber-500/40",
      text: "text-amber-700 dark:text-amber-100",
      dot: "bg-amber-500",
      hover: "hover:bg-amber-500/15 dark:hover:bg-amber-500/20",
    };
  }
  if (status === "slip_3_plus") {
    return {
      bg: "bg-red-500/10 dark:bg-red-500/10",
      border: "border-red-500/40",
      text: "text-red-700 dark:text-red-100",
      dot: "bg-red-500",
      hover: "hover:bg-red-500/15 dark:hover:bg-red-500/20",
    };
  }
  return {
    bg: "bg-neutral-100 dark:bg-zinc-900",
    border: "border-neutral-300 dark:border-zinc-700",
    text: "text-neutral-800 dark:text-zinc-200",
    dot: "bg-neutral-400",
    hover: "hover:bg-neutral-100/80 dark:hover:bg-zinc-800",
  };
}

function formatEta(value) {
  if (!value) return "";
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200">
      {children}
    </span>
  );
}
