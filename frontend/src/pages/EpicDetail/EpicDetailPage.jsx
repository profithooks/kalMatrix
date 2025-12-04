// src/pages/Epics/EpicDetailPage.jsx
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Card from "../../components/ui/Card";
import RiskBadge from "../../components/ui/RiskBadge";
import EpicTrendChart from "./EpicTrendChart";
import EpicDetailSkeleton from "./EpicDetailSkeleton";
import SignalPanel from "./SignalPanel";
import WhyAtRiskCard from "./WhyAtRiskCard";
import { useEpicRiskData } from "../../query/hooks/useEpicRiskData";
import { useEpicJiraDetail } from "../../query/hooks/useEpicJiraDetail";
import EpicJiraIssuesSection from "./EpicJiraIssuesSection";
import WeeklyCheckinHistory from "./WeeklyCheckinHistory";
import { useAuthStore } from "../../store/authStore";
import { useEpicTrendData } from "../../query/hooks/useEpicTrendData";
import { useEpicSignals } from "../../query/hooks/useEpicSignals";
import { useEpicSlipChain } from "../../query/hooks/useEpicSlipChain";
import { useEpicAssigneePerformance } from "../../query/hooks/useEpicAssigneePerformance";
import { useEpicHealth } from "../../query/hooks/useEpicHealth";

export default function EpicDetailPage() {
  const { id } = useParams();
  const epicId = String(id);

  const { user } = useAuthStore();

  const {
    data: riskData,
    isLoading: riskLoading,
    isError: riskError,
  } = useEpicRiskData();

  const meta = riskData?.meta || null;

  const epic = (riskData?.epics || []).find((e) => {
    const candidates = [
      e.id,
      e._id,
      e.epicId,
      e.jiraEpicId,
      e.jiraKey,
      e.key,
      e.raw?.id,
      e.raw?.epicId,
      e.raw?.key,
    ]
      .filter(Boolean)
      .map(String);

    return candidates.includes(epicId);
  });

  const { data: jiraData, isLoading: jiraLoading } = useEpicJiraDetail(epicId);
  const { data: trendData, isLoading: trendLoading } = useEpicTrendData(epicId);
  const { data: signalsData } = useEpicSignals(epicId);
  const {
    data: slipChainDataRaw,
    isLoading: slipLoading,
    isError: slipError,
  } = useEpicSlipChain(epicId);
  const { data: assigneePerfData } = useEpicAssigneePerformance(epicId);
  const topAssignee = assigneePerfData?.assignees?.[0] || null;

  const { data: healthData, isLoading: healthLoading } = useEpicHealth(epicId);

  const slipChainData = slipChainDataRaw || null;
  const slipRootCauses = Array.isArray(slipChainData?.rootCauses)
    ? slipChainData.rootCauses
    : [];

  if (riskLoading) {
    return <EpicDetailSkeleton />;
  }

  if (riskError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white text-sm text-red-500 dark:bg-[#050506] dark:text-red-400">
        Failed to load epic risk data.
      </div>
    );
  }

  if (!epic) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white text-sm text-neutral-500 dark:bg-[#050506] dark:text-zinc-400">
        Epic not found in current workspace.
      </div>
    );
  }

  const band = epic.band || epic.statusBand || classifyRisk(epic.risk);
  const riskPercent = normalizeRiskPercent(epic);

  const predictionWindow =
    epic.predictionWindow ||
    epic.window ||
    epic.forecastWindow ||
    "This quarter";

  const recentTrend =
    trendData?.trend ??
    (typeof epic.riskTrend === "number" ? epic.riskTrend : 0);

  const startDate = epic.startedAt || epic.startDate || epic.raw?.startDate;
  const dueDate = epic.targetDelivery || epic.dueDate || epic.raw?.targetDate;

  const jiraEpic = jiraData?.epic;
  const jiraIssues = jiraData?.issues || [];
  const totalIssues = jiraIssues.length;
  const totalComments = jiraIssues.reduce(
    (sum, issue) => sum + (issue.comments?.length || 0),
    0
  );

  const jiraKey = jiraEpic?.key || epic.key || epic.raw?.key;
  const jiraState =
    jiraEpic?.state || jiraEpic?.status || epic.state || "Unknown state";
  const jiraUrl = jiraEpic?.url || epic.url || epic.raw?.url || null;

  const bandLabel =
    band === "red_zone"
      ? "Red zone"
      : band === "at_risk"
      ? "At risk"
      : "Healthy";

  const epicTitle =
    epic.title ||
    epic.epic ||
    epic.summary ||
    jiraEpic?.summary ||
    epic.raw?.summary ||
    "Untitled";

  const workspaceName = user?.workspace?.name || "Workspace";

  const accuracyRaw = typeof meta?.accuracy === "number" ? meta.accuracy : null;
  const accuracyPercent =
    accuracyRaw == null
      ? null
      : accuracyRaw <= 1
      ? Math.round(accuracyRaw * 100)
      : Math.round(accuracyRaw);

  const baseReasonsRaw =
    (signalsData && Array.isArray(signalsData.reasons)
      ? signalsData.reasons
      : null) ||
    epic.riskSummary?.reasons ||
    epic.reasons ||
    [];

  const baseReasons = Array.isArray(baseReasonsRaw)
    ? baseReasonsRaw
    : typeof baseReasonsRaw === "string"
    ? [baseReasonsRaw]
    : [];

  const normalizedSignals = baseReasons.map((msg, idx) => {
    let severity = "low";
    if (idx === 0) severity = "high";
    else if (idx === 1) severity = "medium";

    return {
      code: `SIG_${idx + 1}`,
      message: msg,
      severity,
    };
  });

  const riskTrend =
    typeof epic.riskTrend === "number" ? epic.riskTrend : recentTrend || 0;

  const genome = epic.predictionIntelligence?.genome || null;

  return (
    <div className="min-h-full w-full bg-white text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 pb-10 sm:py-6 lg:py-7">
        {/* HEADER */}
        <header className="flex flex-col gap-3 border-b border-neutral-200 pb-4 dark:border-zinc-900">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-zinc-500">
            <Link
              to="/epics"
              className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white/90 px-2 py-1 text-[11px] text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-900 dark:border-zinc-800 dark:bg-black/70 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-black dark:hover:text-zinc-100"
            >
              <ArrowLeft className="h-3 w-3" />
            </Link>
            <span className="mx-1 text-[10px] text-neutral-400 dark:text-zinc-600">
              /
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
              {workspaceName} · Epic detail
            </span>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {jiraKey && (
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] font-mono text-neutral-50 dark:bg-zinc-50 dark:text-zinc-900">
                    {jiraKey}
                  </span>
                )}
                {/* Keep existing RiskBadge API; just make it visually consistent */}
                <RiskBadge band={band} />
              </div>
              <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-zinc-50 sm:text-[24px] md:text-[26px]">
                {epicTitle}
              </h1>
              <p className="text-[11px] text-neutral-600 dark:text-zinc-400">
                {jiraState}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white/90 px-3 py-1.5 text-[11px] text-neutral-700 shadow-sm dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-200">
                <span className="font-semibold">
                  Risk: {bandLabel} · {riskPercent}%
                </span>
                {!trendLoading && (
                  <span className="font-mono text-[11px] text-neutral-500 dark:text-zinc-500">
                    {formatTrendArrow(riskTrend)} vs last run
                  </span>
                )}
              </div>
              {jiraUrl && (
                <a
                  href={jiraUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
                >
                  Open in Jira
                </a>
              )}
            </div>
          </div>
        </header>

        {/* BODY GRID */}
        <main className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)]">
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4">
            {/* SUMMARY STRIP */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {/* RISK SCORE */}
              <Card className="border border-neutral-200 bg-white/90 px-4 py-4 dark:border-zinc-800 dark:bg-black/80">
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
                  Risk score
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
                  0–100 scale from KalMatrix risk engine.
                </p>
              </Card>

              {/* WINDOW */}
              <Card className="border border-neutral-200 bg-white/90 px-4 py-4 dark:border-zinc-800 dark:bg-black/80">
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
                  Window
                </p>
                <p className="mt-2 text-xl font-semibold text-neutral-900 dark:text-zinc-50">
                  {predictionWindow}
                </p>
                <p className="mt-1 text-[11px] text-neutral-600 dark:text-zinc-500">
                  How close this epic is to blowing up your current quarter.
                </p>
              </Card>

              {/* FORECAST ACCURACY */}
              <Card className="border border-neutral-200 bg-white/90 px-4 py-4 dark:border-zinc-800 dark:bg-black/80">
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
                  Forecast accuracy
                </p>
                {accuracyPercent != null || meta?.accuracyLabel ? (
                  <>
                    <p className="mt-2 text-xl font-semibold text-neutral-900 dark:text-zinc-50">
                      {accuracyPercent != null ? accuracyPercent : "—"}%
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-600 dark:text-zinc-500">
                      {meta?.accuracyLabel ||
                        "How often KalMatrix predictions matched reality over recent epics."}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[11px] text-neutral-600 dark:text-zinc-500">
                    Risk engine is still warming up. Accuracy appears once
                    enough past epics have closed.
                  </p>
                )}
              </Card>

              {/* TIMELINE */}
              <Card className="border border-neutral-200 bg-white/90 px-4 py-4 dark:border-zinc-800 dark:bg-black/80">
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
                  Timeline
                </p>
                <p className="mt-1 text-[11px] text-neutral-600 dark:text-zinc-500">
                  Start:{" "}
                  <span className="font-mono text-neutral-900 dark:text-zinc-200">
                    {formatDate(startDate)}
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-neutral-600 dark:text-zinc-500">
                  Due:{" "}
                  <span className="font-mono text-neutral-900 dark:text-zinc-200">
                    {formatDate(dueDate)}
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-neutral-600 dark:text-zinc-500">
                  {dueDate && startDate
                    ? `${daysBetween(startDate, dueDate)} days planned window`
                    : "No clear delivery window set."}
                </p>
              </Card>
            </section>

            {/* RISK TREND + WHY AT RISK */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
              <Card className="border border-neutral-200 bg-white/90 px-4 py-4 dark:border-zinc-800 dark:bg-black/80">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
                      Risk over time
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-zinc-400">
                      How the risk score moved across prediction runs.
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <EpicTrendChart epicId={epicId} />
                </div>
              </Card>

              <WhyAtRiskCard epic={epic} />
            </section>

            {/* SIGNALS + PREDICTION INTELLIGENCE */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)]">
              <SignalPanel signals={normalizedSignals} />

              <section>
                <Card className="border border-neutral-200 bg-white/90 px-5 py-5 dark:border-zinc-800 dark:bg-black/80">
                  <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-400">
                    Prediction intelligence
                  </h2>

                  {!epic.predictionIntelligence && (
                    <p className="text-[11px] text-neutral-600 dark:text-zinc-500">
                      No prediction intelligence available.
                    </p>
                  )}

                  {epic.predictionIntelligence &&
                    (() => {
                      const pi = epic.predictionIntelligence;
                      const conf =
                        typeof pi.confidence === "number"
                          ? pi.confidence
                          : null;
                      const confPct =
                        conf == null
                          ? null
                          : conf <= 1
                          ? Math.round(conf * 100)
                          : Math.round(conf);

                      return (
                        <div className="space-y-4">
                          <div className="text-[11px] text-neutral-700 dark:text-zinc-200">
                            Confidence:
                            <span className="ml-1 font-mono text-neutral-900 dark:text-zinc-100">
                              {confPct != null ? `${confPct}%` : "—"}
                            </span>
                            <span className="ml-2 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-neutral-50 dark:bg-zinc-100 dark:text-zinc-900">
                              {conf != null && conf >= 0.8
                                ? "High"
                                : conf != null && conf >= 0.5
                                ? "Medium"
                                : "Low"}
                            </span>
                          </div>

                          <SignalsBucket
                            title="Strong signals"
                            emptyCopy="No strong negative signals. Risk is driven by softer patterns."
                            items={pi.strongSignals}
                            className="rounded-lg bg-red-500/10 px-2 py-1 text-[11px] text-red-600 dark:bg-red-500/15 dark:text-red-300"
                          />

                          <SignalsBucket
                            title="Weak signals"
                            emptyCopy="No weak signals logged. Either data is clean or engine is still learning."
                            items={pi.weakSignals}
                            className="rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                          />

                          <SignalsBucket
                            title="Missing signals"
                            emptyCopy="No obvious blind spots. We have enough telemetry to make this call."
                            items={pi.missingSignals}
                            className="rounded-lg bg-neutral-100 px-2 py-1 text-[11px] text-neutral-700 dark:bg-zinc-900 dark:text-zinc-200"
                          />
                        </div>
                      );
                    })()}
                </Card>
              </section>
            </section>

            {/* SLIP CHAIN / ROOT CAUSES */}
            <section>
              <Card className="border border-neutral-200 bg-white/90 px-5 py-5 dark:border-zinc-800 dark:bg-black/80">
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-400">
                  Slip chain
                </h2>

                {slipLoading && (
                  <p className="text-[11px] text-neutral-600 dark:text-zinc-500">
                    Analyzing slip chain…
                  </p>
                )}

                {slipError && !slipLoading && (
                  <p className="text-[11px] text-red-500 dark:text-red-400">
                    Failed to load slip chain for this epic.
                  </p>
                )}

                {!slipLoading && !slipError && !slipChainData && (
                  <p className="text-[11px] text-neutral-600 dark:text-zinc-500">
                    No slip chain data yet. This epic either hasn’t slipped or
                    we don’t have enough history.
                  </p>
                )}

                {!slipLoading && !slipError && slipChainData && (
                  <div className="space-y-4">
                    <div className="text-[11px] text-neutral-600 dark:text-zinc-400">
                      <p>
                        Outcome:{" "}
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {slipChainData.epic?.outcomeBand || "on_time"}
                        </span>
                        {typeof slipChainData.epic?.slipDays === "number" && (
                          <>
                            {" "}
                            ·{" "}
                            <span className="font-mono text-neutral-900 dark:text-zinc-100">
                              {Math.round(slipChainData.epic.slipDays)}
                            </span>{" "}
                            day
                            {Math.round(slipChainData.epic.slipDays) === 1
                              ? ""
                              : "s"}{" "}
                            slip
                          </>
                        )}
                      </p>
                    </div>

                    {Array.isArray(slipChainData.timeline) &&
                      slipChainData.timeline.length > 0 && (
                        <div className="border-t border-neutral-200 pt-3 dark:border-zinc-800">
                          <p className="mb-1 text-[11px] font-semibold text-neutral-700 dark:text-zinc-200">
                            Epic timeline
                          </p>
                          <ol className="space-y-1 text-[11px] text-neutral-700 dark:text-zinc-200">
                            {slipChainData.timeline.map((evt, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-zinc-500" />
                                <div>
                                  <p className="font-mono text-[11px] text-neutral-900 dark:text-zinc-50">
                                    {formatDate(evt.date)}
                                  </p>
                                  <p className="text-[11px] text-neutral-700 dark:text-zinc-200">
                                    {evt.label}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-neutral-700 dark:text-zinc-200">
                        Top root causes
                      </p>
                      {slipRootCauses.length === 0 ? (
                        <p className="text-[11px] text-neutral-600 dark:text-zinc-500">
                          No specific long-running stories or critical bugs were
                          identified as root causes.
                        </p>
                      ) : (
                        <ul className="space-y-1 text-[11px] text-neutral-700 dark:text-zinc-200">
                          {slipRootCauses.map((rc) => {
                            const assigneeLabel = formatAssignee(rc.assignee);

                            return (
                              <li
                                key={rc.issueId || rc.key}
                                className="flex items-start justify-between gap-3 rounded-lg bg-neutral-100/70 px-3 py-2 dark:bg-zinc-900/70"
                              >
                                <div>
                                  <p className="font-mono text-[11px] text-neutral-900 dark:text-zinc-50">
                                    {rc.key || rc.issueId || "Unknown"}{" "}
                                    {rc.type && (
                                      <span className="ml-1 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-neutral-50 dark:bg-zinc-800 dark:text-zinc-200">
                                        {rc.type}
                                      </span>
                                    )}
                                    {rc.priority && (
                                      <span className="ml-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-red-600 dark:bg-red-500/15 dark:text-red-300">
                                        {rc.priority}
                                      </span>
                                    )}
                                  </p>

                                  {assigneeLabel && (
                                    <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-zinc-400">
                                      Owner:{" "}
                                      <span className="font-mono text-neutral-900 dark:text-zinc-100">
                                        {assigneeLabel}
                                      </span>
                                    </p>
                                  )}

                                  <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-zinc-400">
                                    Open{" "}
                                    {rc.ageDays != null ? (
                                      <>
                                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                                          {Math.round(rc.ageDays)}
                                        </span>{" "}
                                        day
                                        {Math.round(rc.ageDays) === 1
                                          ? ""
                                          : "s"}
                                      </>
                                    ) : (
                                      "age unknown"
                                    )}
                                    {rc.cycleTimeDays != null && (
                                      <>
                                        {" "}
                                        · cycle time{" "}
                                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                                          {Math.round(rc.cycleTimeDays)}
                                        </span>{" "}
                                        day
                                        {Math.round(rc.cycleTimeDays) === 1
                                          ? ""
                                          : "s"}
                                      </>
                                    )}
                                  </p>

                                  {Array.isArray(rc.flags) &&
                                    rc.flags.length > 0 && (
                                      <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-zinc-400">
                                        Flags:{" "}
                                        {rc.flags.map((f, i) => (
                                          <span
                                            key={f + i}
                                            className="mr-1 inline-flex items-center rounded-full bg-neutral-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-neutral-50 dark:bg-zinc-700"
                                          >
                                            {f}
                                          </span>
                                        ))}
                                      </p>
                                    )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </section>

            {/* JIRA ISSUES */}
            <section>
              <EpicJiraIssuesSection
                jiraEpic={jiraEpic}
                issues={jiraIssues}
                loading={jiraLoading}
                totalIssues={totalIssues}
                totalComments={totalComments}
              />
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-4">
            <WeeklyCheckinHistory epicId={epicId} />

            <section>
              <Card className="border border-neutral-200 bg-white/90 px-5 py-5 text-[11px] dark:border-zinc-800 dark:bg-black/80">
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-400">
                  Flow health
                </h2>

                {healthLoading && (
                  <p className="text-neutral-600 dark:text-zinc-500">
                    Loading health metrics…
                  </p>
                )}

                {!healthLoading && !healthData && (
                  <p className="text-neutral-600 dark:text-zinc-500">
                    No health data available yet.
                  </p>
                )}

                {!healthLoading && healthData && (
                  <div className="space-y-2 text-neutral-700 dark:text-zinc-200">
                    <p>
                      Issues in scope:{" "}
                      <span className="font-mono text-neutral-900 dark:text-zinc-100">
                        {healthData.totalIssues}
                      </span>
                    </p>
                    <p>
                      Blocked:{" "}
                      <span className="font-mono text-red-600 dark:text-red-300">
                        {healthData.blockedIssues}
                      </span>
                    </p>
                    <p>
                      In progress:{" "}
                      <span className="font-mono text-neutral-900 dark:text-zinc-100">
                        {healthData.inProgressIssues}
                      </span>
                    </p>
                    <p>
                      Done:{" "}
                      <span className="font-mono text-emerald-600 dark:text-emerald-300">
                        {healthData.doneIssues}
                      </span>
                    </p>

                    <p>
                      Days since last movement:{" "}
                      {healthData.daysSinceLastMovement == null ? (
                        <span className="text-neutral-600 dark:text-zinc-400">
                          Unknown
                        </span>
                      ) : (
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {healthData.daysSinceLastMovement} day
                          {healthData.daysSinceLastMovement === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>

                    <p>
                      Days to due date:{" "}
                      {healthData.daysToDue != null ? (
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {healthData.daysToDue} day
                          {healthData.daysToDue === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-neutral-600 dark:text-zinc-400">
                          No target date
                        </span>
                      )}
                    </p>

                    <p>
                      Scope added after start:{" "}
                      <span className="font-mono text-neutral-900 dark:text-zinc-100">
                        {healthData.issuesAddedAfterStart}
                      </span>
                      {healthData.totalIssues > 0 && (
                        <span className="ml-1 text-neutral-500 dark:text-zinc-500">
                          ({healthData.scopeCreepPercent}% of scope)
                        </span>
                      )}
                    </p>

                    <p>
                      Cycle time:{" "}
                      {healthData.avgCycleTimeEpicDays == null ? (
                        <span className="text-neutral-600 dark:text-zinc-400">
                          Not enough completed issues
                        </span>
                      ) : (
                        <>
                          <span className="font-mono text-neutral-900 dark:text-zinc-100">
                            {healthData.avgCycleTimeEpicDays.toFixed(1)}d
                          </span>{" "}
                          per issue
                        </>
                      )}
                    </p>
                  </div>
                )}
              </Card>
            </section>

            {genome && (
              <section>
                <Card className="border border-neutral-200 bg-white/90 px-5 py-5 dark:border-zinc-800 dark:bg-black/80">
                  <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-400">
                    Delivery genome
                  </h2>

                  <div className="space-y-3 text-[11px] text-neutral-700 dark:text-zinc-200">
                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-neutral-700 dark:text-zinc-200">
                        Workload
                      </p>
                      <p>
                        Stories:{" "}
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {genome.workload?.totalStories ?? "—"}
                        </span>{" "}
                        · Done:{" "}
                        <span className="font-mono text-emerald-600 dark:text-emerald-300">
                          {genome.workload?.doneStories ?? "—"}
                        </span>{" "}
                        · In progress:{" "}
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {genome.workload?.inProgressStories ?? "—"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-zinc-400">
                        Open issues:{" "}
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {genome.workload?.openIssuesCount ?? "—"}
                        </span>{" "}
                        · In review:{" "}
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {genome.workload?.inReviewIssuesCount ?? "—"}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-neutral-700 dark:text-zinc-200">
                        Scope
                      </p>
                      <p>
                        Story points:{" "}
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {genome.scope?.storyPointsTotal ?? "—"}
                        </span>{" "}
                        · Completed:{" "}
                        <span className="font-mono text-emerald-600 dark:text-emerald-300">
                          {genome.scope?.storyPointsCompleted ?? "—"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-600 dark:text-zinc-400">
                        New issues today:{" "}
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {genome.scope?.newIssuesCreatedToday ?? "0"}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-neutral-700 dark:text-zinc-200">
                        Movement
                      </p>
                      <p>
                        Days since any movement:{" "}
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {genome.movement?.daysSinceMovement ?? "—"}
                        </span>
                      </p>
                      <p>
                        Days since last done:{" "}
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {genome.movement?.daysSinceLastDone ?? "—"}
                        </span>
                      </p>
                      <p>
                        Days to target:{" "}
                        <span className="font-mono text-neutral-900 dark:text-zinc-100">
                          {genome.movement?.daysToTarget != null
                            ? Math.round(genome.movement.daysToTarget)
                            : "—"}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-neutral-700 dark:text-zinc-200">
                        Hygiene
                      </p>
                      <p className="space-x-1">
                        <BadgeGenome
                          label="Owner"
                          ok={genome.hygiene?.hasOwner}
                        />
                        <BadgeGenome
                          label="Target date"
                          ok={genome.hygiene?.hasTargetDelivery}
                        />
                        <BadgeGenome
                          label="Estimates"
                          ok={genome.hygiene?.hasEstimates}
                        />
                      </p>
                    </div>
                  </div>
                </Card>
              </section>
            )}

            {topAssignee && (
              <section>
                <Card className="border border-neutral-200 bg-white/90 px-5 py-5 dark:border-zinc-800 dark:bg-black/80">
                  <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-400">
                    Lead execution pattern
                  </h2>
                  <div className="space-y-2 text-[11px] text-neutral-700 dark:text-zinc-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-neutral-900 dark:text-zinc-50">
                          {topAssignee.name}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-zinc-400">
                          Owner on most issues in this epic.
                        </p>
                      </div>
                      <div className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-50 dark:bg-zinc-100 dark:text-zinc-900">
                        {topAssignee.completionRate != null
                          ? `${Math.round(
                              topAssignee.completionRate * 100
                            )}% done`
                          : "No history"}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <StatMini
                        label="Issues"
                        value={topAssignee.issuesTotal}
                        tone="neutral"
                      />
                      <StatMini
                        label="Done"
                        value={topAssignee.issuesDone}
                        tone="green"
                      />
                      <StatMini
                        label="Blocked"
                        value={topAssignee.blockedIssues}
                        tone="amber"
                      />
                    </div>

                    <div className="mt-2">
                      {topAssignee.avgCycleTimeDays != null && (
                        <p className="text-[11px] text-neutral-600 dark:text-zinc-400">
                          Avg cycle time:{" "}
                          <span className="font-mono text-neutral-900 dark:text-zinc-100">
                            {topAssignee.avgCycleTimeDays.toFixed(1)}d
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function classifyRisk(risk) {
  const value = typeof risk === "number" ? risk : 0;
  if (value >= 0.7) return "red_zone";
  if (value >= 0.5) return "at_risk";
  return "healthy";
}

function normalizeRiskPercent(epic) {
  const rScore = typeof epic.riskScore === "number" ? epic.riskScore : null;
  const r = typeof epic.risk === "number" ? epic.risk : null;

  if (rScore != null) {
    return rScore <= 1 ? Math.round(rScore * 100) : Math.round(rScore);
  }
  if (r != null) {
    return r <= 1 ? Math.round(r * 100) : Math.round(r);
  }
  return 0;
}

function formatTrendArrow(trend) {
  if (trend > 0.05) return "↑ higher";
  if (trend < -0.05) return "↓ lower";
  return "→ stable";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function daysBetween(a, b) {
  if (!a || !b) return "—";
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return "—";
  const diffMs = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

function StatMini({ label, value, tone }) {
  let color = "text-neutral-900 dark:text-zinc-100";
  if (tone === "green") color = "text-emerald-600 dark:text-emerald-300";
  else if (tone === "amber") color = "text-amber-600 dark:text-amber-300";

  return (
    <div>
      <p className="text-[11px] text-neutral-600 dark:text-zinc-500">{label}</p>
      <p className={`font-mono text-sm ${color}`}>{value}</p>
    </div>
  );
}

function BadgeGenome({ label, ok }) {
  if (ok == null) {
    return (
      <span className="inline-flex items-center rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] text-neutral-500 dark:border-zinc-700 dark:text-zinc-400">
        {label}: ?
      </span>
    );
  }

  if (ok) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
        {label}: OK
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
      {label}: Missing
    </span>
  );
}

function SignalsBucket({ title, emptyCopy, items, className }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold text-neutral-700 dark:text-zinc-200">
        {title}
      </p>
      {list.length === 0 ? (
        <p className="text-[11px] text-neutral-600 dark:text-zinc-500">
          {emptyCopy}
        </p>
      ) : (
        <ul className="space-y-1 text-[11px] text-neutral-700 dark:text-zinc-200">
          {list.map((s, i) => (
            <li key={i} className={className}>
              {s.message || s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatAssignee(value) {
  if (!value) return null;

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    const parts = value.map((v) => formatAssignee(v)).filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }

  if (typeof value === "object") {
    if (typeof value.displayName === "string" && value.displayName.trim()) {
      return value.displayName.trim();
    }
    if (typeof value.email === "string" && value.email.trim()) {
      return value.email.trim();
    }
    if (typeof value.accountId === "string" && value.accountId.trim()) {
      return value.accountId.trim();
    }
  }

  try {
    return String(value);
  } catch {
    return null;
  }
}
