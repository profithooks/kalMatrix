// src/prediction/evaluateEpicSignals.js
import SIGNAL_DEFINITIONS from "./signalDefinitions.js";

/**
 * @param {Object} params
 * @param {Object} params.epic
 * @param {Array<Object>} params.issues
 * @param {Object|null} params.dailySignal
 * @param {Object|null} params.ownerMetrics
 * @param {Array<Object>} params.weeklyCheckins
 * @param {Date} [params.now]
 */
export function evaluateEpicSignals({
  epic,
  issues,
  dailySignal,
  ownerMetrics,
  weeklyCheckins,
  now = new Date(),
}) {
  const triggered = [];
  let latestWeeklyStatus = null;
  let daysSinceLatestCheckin = null;

  const addSignal = (id) => {
    const def = SIGNAL_DEFINITIONS[id];
    if (!def) return;
    triggered.push(def);
  };

  const daysBetween = (a, b) =>
    Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

  const isDoneCategory = (cat) => cat === "done";
  const isInProgressCategory = (cat) =>
    cat === "in_progress" || cat === "review";

  const totalStories = issues.length;
  const doneStories = issues.filter((i) =>
    isDoneCategory(i.statusCategory)
  ).length;
  const inProgressStories = issues.filter((i) =>
    isInProgressCategory(i.statusCategory)
  ).length;

  const completionRatio = totalStories ? doneStories / totalStories : 0;

  const lastMovementAt = computeLastMovementAt(epic, issues);
  const daysSinceMovement =
    lastMovementAt != null ? daysBetween(now, lastMovementAt) : null;

  const targetDelivery = epic?.targetDelivery || null;
  const daysToTarget =
    targetDelivery != null
      ? (targetDelivery - now) / (1000 * 60 * 60 * 24)
      : null;

  const mainOwner = epic?.assignees?.[0] || null;

  const statusCategory =
    epic?.statusCategory ||
    (epic?.state && epic.state.toLowerCase().includes("done") ? "done" : null);

  const isClosedByState =
    epic?.state && ["Done", "Closed", "Cancelled"].includes(epic.state);
  const isClosedFlag = epic?.isActive === false;
  const isClosedByHistory = Array.isArray(epic?.statusHistory)
    ? epic.statusHistory.some((h) => h.category === "done" && !h.to)
    : false;

  const isEpicCompleted =
    statusCategory === "done" ||
    isClosedByState ||
    isClosedFlag ||
    isClosedByHistory;

  // ---------- COMPLETED EPIC SHORT-CIRCUIT ----------
  // Only treat as completed when Jira thinks it is done
  if (isEpicCompleted) {
    const closedAt = epic?.closedAt || lastMovementAt || epic?.updatedAt || now;

    // baseline low risk for completed epics
    let riskScore = 10;
    let riskLevel = "on_track";
    const reasons = ["Epic is completed."];

    if (targetDelivery) {
      if (closedAt <= targetDelivery) {
        // delivered on or before target → keep 10, just add explanation
        reasons.push("Epic was delivered on or before target date.");
      } else {
        const daysLate = Math.ceil(
          (closedAt - targetDelivery) / (1000 * 60 * 60 * 24)
        );

        if (daysLate <= 7) {
          riskScore = 20;
          riskLevel = "at_risk";
          reasons.push(
            `Epic was delivered ${daysLate} day(s) after target date.`
          );
        } else {
          riskScore = 30;
          riskLevel = "at_risk";
          reasons.push(
            `Epic was delivered ${daysLate} day(s) after target date.`
          );
        }
      }
    }

    const signalsSnapshot = buildSignalsSnapshot({
      totalStories,
      doneStories,
      inProgressStories,
      completionRatio,
      daysSinceMovement,
      daysToTarget,
      dailySignal,
    });

    const summary = {
      totalStories,
      doneStories,
      inProgressStories,
      completionRatio,
      daysSinceMovement,
      daysToTarget,
    };

    const genome = buildGenome({
      epic,
      issues,
      dailySignal,
      summary,
    });

    // Completed = high confidence by definition
    const confidence = 0.9;

    return {
      riskLevel,
      probability: riskScore,
      forecastWindow: "completed",
      reasons,
      signals: signalsSnapshot,
      confidence,
      strongSignals: [],
      weakSignals: [],
      missingSignals: [],
      genome,
    };
  }

  // ---------- PLANNING / STRUCTURE ----------

  if (totalStories === 0) {
    addSignal("NO_STORIES_LINKED");
  }

  const anyEstimates = issues.some((i) => i.storyPoints != null);
  if (totalStories > 0 && !anyEstimates) {
    addSignal("NO_ESTIMATES_DEFINED");
  }

  if (!targetDelivery) {
    addSignal("EPIC_NO_TARGET_DATE");
  }

  if (!mainOwner || !mainOwner.accountId) {
    addSignal("EPIC_NO_OWNER");
  }

  // ---------- EXECUTION / MOVEMENT ----------

  if (daysSinceMovement != null) {
    if (daysSinceMovement >= 14) {
      addSignal("NO_MOVEMENT_14_DAYS");
    } else if (daysSinceMovement >= 7) {
      addSignal("NO_MOVEMENT_7_DAYS");
    }
  }

  if (daysToTarget != null && !Number.isNaN(daysToTarget)) {
    if (daysToTarget <= 0 && completionRatio < 1) {
      addSignal("PAST_DUE_NOT_COMPLETED");
    } else if (daysToTarget <= 7 && completionRatio < 0.6) {
      addSignal("NEAR_DUE_LOW_COMPLETION");
    }
  }

  if (inProgressStories >= 6) {
    addSignal("HIGH_WIP_IN_PROGRESS");
  }

  const longRunning = issues.filter((i) => {
    if (!isInProgressCategory(i.statusCategory)) return false;
    if (!i.createdAtJira) return false;
    const daysInExistence = daysBetween(now, i.createdAtJira);
    return daysInExistence >= 14;
  }).length;

  if (longRunning > 0) {
    addSignal("LONG_RUNNING_STORIES");
  }

  // ---------- BUGS / QUALITY ----------

  const bugIssues = issues.filter((i) => i.type === "Bug");
  if (bugIssues.length >= 5) {
    addSignal("HIGH_BUG_COUNT");
  }

  const openCriticalBugs = bugIssues.filter(
    (i) =>
      !isDoneCategory(i.statusCategory) &&
      (i.priority === "Critical" || i.priority === "Blocker")
  ).length;

  if (openCriticalBugs > 0) {
    addSignal("OPEN_CRITICAL_BUGS");
  }

  // ---------- OWNER / ASSIGNEE METRICS ----------

  if (mainOwner && ownerMetrics && ownerMetrics.window30d) {
    const w30 = ownerMetrics.window30d;

    if (w30.storiesCompleted != null && w30.storiesCompleted <= 2) {
      addSignal("OWNER_LOW_VELOCITY");
    } else if (w30.storiesCompleted >= 10) {
      addSignal("OWNER_STRONG_VELOCITY");
    }

    if (w30.reopenedCount != null && w30.reopenedCount >= 5) {
      addSignal("OWNER_HIGH_REOPEN_RATE");
    }

    if (
      w30.epicsOwned != null &&
      w30.epicsOwned >= 3 &&
      w30.epicsOnTime / Math.max(w30.epicsOwned, 1) >= 0.7
    ) {
      addSignal("OWNER_HISTORY_ON_TIME");
    }
  }

  if (mainOwner && daysSinceMovement != null && daysSinceMovement >= 7) {
    addSignal("OWNER_NO_ACTIVITY_7_DAYS");
  }
  const activeDays = epic.startedAt ? daysBetween(now, epic.startedAt) : null;

  if (Array.isArray(weeklyCheckins) && weeklyCheckins.length > 0) {
    const latestCheckin = weeklyCheckins[0];
    daysSinceLatestCheckin = daysBetween(now, latestCheckin.weekStart);
    latestWeeklyStatus =
      latestCheckin.status || latestCheckin.leadAnswer || null;

    console.log("[evaluateEpicSignals] weeklyCheckin", {
      epicId: String(epic._id),
      key: epic.key,
      latestStatus: latestWeeklyStatus,
      weekStart: latestCheckin.weekStart,
      daysSinceCheckin: daysSinceLatestCheckin,
      daysToTarget,
    });

    const nearWindow = daysToTarget == null || daysToTarget <= 28; // only care in last ~4 weeks

    // If we have a recent check-in (< 14 days), DO NOT add "no weekly check-in"
    if (daysSinceLatestCheckin >= 14 && nearWindow) {
      addSignal("NO_WEEKLY_CHECKIN_2_WEEKS");
    }
  } else {
    const oldEnough = activeDays == null || activeDays >= 7;
    const nearWindow = daysToTarget == null || daysToTarget <= 28;

    console.log("[evaluateEpicSignals] no_weekly_checkin", {
      epicId: String(epic._id),
      key: epic.key,
      activeDays,
      daysToTarget,
      oldEnough,
      nearWindow,
    });

    if (oldEnough && nearWindow) {
      addSignal("NO_WEEKLY_CHECKIN_2_WEEKS");
    }
  }

  // ---------- POSITIVE EXECUTION ----------

  if (completionRatio >= 0.7 && totalStories >= 1) {
    addSignal("GOOD_PROGRESS_STEADY");
  }

  if (daysSinceMovement != null && daysSinceMovement <= 3) {
    addSignal("RECENT_MOVEMENT");
  }

  if (
    daysToTarget != null &&
    daysToTarget > 7 &&
    completionRatio >= 0.5 &&
    completionRatio < 1
  ) {
    addSignal("ON_TRACK_VS_TARGET");
  }

  // ---------- SCORE FROM SIGNALS ----------

  // ----------------------------------------
  // HARD RED: any killer signals?
  // ----------------------------------------
  const hasHardRedSignals = triggered.some((s) => s.hardRed);

  // ----------------------------------------
  // BASE SCORE FROM SIGNALS
  // ----------------------------------------
  let base = 45;
  let totalWeight = 0;

  for (const s of triggered) {
    totalWeight += s.weight;
  }

  // Clamp contribution to avoid crazy outliers
  totalWeight = Math.max(-50, Math.min(50, totalWeight));

  let riskScore = Math.max(0, Math.min(100, base + totalWeight));

  // If we have hard red signals (e.g. badly overdue), force high risk
  if (hasHardRedSignals && riskScore < 80) {
    riskScore = 80;
  }

  // ----------------------------------------
  // INITIAL BAND FROM SCORE
  // ----------------------------------------
  let band = "unknown";
  if (riskScore >= 65) band = "off_track";
  else if (riskScore >= 50) band = "at_risk";
  else band = "on_track";

  // If hard red, keep off_track (even if score got bumped weirdly)
  if (hasHardRedSignals) {
    band = "off_track";
  }

  // ----------------------------------------
  // WEEKLY CHECK-IN OVERRIDE (FINAL STEP)
  // ----------------------------------------
  if (
    latestWeeklyStatus &&
    daysSinceLatestCheckin != null &&
    daysSinceLatestCheckin <= 7 // only trust fresh check-ins
  ) {
    // debug
    console.log("[evaluateEpicSignals] weekly_override_input", {
      epicId: String(epic._id),
      key: epic.key,
      latestWeeklyStatus,
      daysSinceLatestCheckin,
      hasHardRedSignals,
      riskScoreBefore: riskScore,
      bandBefore: band,
    });

    if (latestWeeklyStatus === "on_track") {
      // even if there are hard red structural signals,
      // we still want to *soften* but not flip a true red to green.
      // So we do NOT short-circuit on hasHardRedSignals here;
      // the hard red will still force band=off_track below when needed.

      // soften numeric risk a bit
      riskScore = Math.max(0, riskScore - 15);

      // soften band if not truly horrible
      if (band === "off_track" && riskScore < 80) {
        band = "at_risk";
      } else if (band === "at_risk" && riskScore <= 65) {
        band = "on_track";
      }
    } else if (latestWeeklyStatus === "slip_1_to_2w") {
      // medium slip → push risk up
      riskScore = Math.min(100, riskScore + 10);
      if (band === "on_track") band = "at_risk";
    } else if (latestWeeklyStatus === "slip_3_plus") {
      // big slip → force red
      riskScore = Math.max(riskScore, 80);
      band = "off_track";
    }

    console.log("[evaluateEpicSignals] weekly_override_output", {
      epicId: String(epic._id),
      key: epic.key,
      latestWeeklyStatus,
      riskScoreAfter: riskScore,
      bandAfter: band,
    });
  }

  const isPastDueAndNotDone =
    targetDelivery != null &&
    daysToTarget != null &&
    !Number.isNaN(daysToTarget) &&
    daysToTarget <= 0;

  let riskLevel;

  if (isPastDueAndNotDone) {
    if (latestWeeklyStatus === "on_track" && daysSinceLatestCheckin <= 7) {
      // allow at most amber
      riskLevel = riskScore >= 65 ? "at_risk" : "at_risk"; // always amber when late but lead says OK
    } else {
      riskLevel = "off_track";
    }
  } else if (riskScore >= 65) {
    riskLevel = "off_track";
  } else if (riskScore >= 50) {
    riskLevel = "at_risk";
  } else {
    riskLevel = "on_track";
  }

  const negatives = triggered.filter((s) => s.type === "negative");
  const positives = triggered.filter((s) => s.type === "positive");

  negatives.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  positives.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  const reasons = [
    ...negatives.slice(0, 5).map((s) => s.message),
    ...positives.slice(0, 3).map((s) => s.message),
  ];

  const signalsSnapshot = buildSignalsSnapshot({
    totalStories,
    doneStories,
    inProgressStories,
    completionRatio,
    daysSinceMovement,
    daysToTarget,
    dailySignal,
  });

  const forecastWindow = computeForecastWindow({
    daysToTarget,
    band,
    latestWeeklyStatus,
  });

  const summary = {
    totalStories,
    doneStories,
    inProgressStories,
    completionRatio,
    daysSinceMovement,
    daysToTarget,
  };

  const { confidence, strongSignals, weakSignals, missingSignals } =
    buildConfidenceMeta({
      triggered,
      issues,
      dailySignal,
      weeklyCheckins,
    });

  const genome = buildGenome({
    epic,
    issues,
    dailySignal,
    summary,
  });

  console.log("[evaluateEpicSignals] before_weekly", {
    epicId: String(epic._id),
    key: epic.key,
    riskScore,
    band,
    latestWeeklyStatus,
    confidence,
  });

  return {
    riskLevel,
    probability: riskScore,
    forecastWindow,
    reasons,
    signals: signalsSnapshot,
    confidence,
    strongSignals,
    weakSignals,
    missingSignals,
    genome,
  };
}

function computeForecastWindow({ daysToTarget, band, latestWeeklyStatus }) {
  // 1) If the lead explicitly said in weekly check-in that it will slip,
  // trust that first.
  if (latestWeeklyStatus === "slip_3_plus") {
    return "3+_weeks";
  }
  if (latestWeeklyStatus === "slip_1_3") {
    return "1-3_weeks";
  }

  // 2) If we have a target date, derive window from days remaining.
  if (typeof daysToTarget === "number") {
    // daysToTarget can be negative once due date passes, but by then
    // the epic is probably already marked completed / overdue elsewhere.
    if (daysToTarget <= 14) {
      return "0-2_weeks";
    }
    if (daysToTarget <= 28) {
      return "2-4_weeks";
    }
    if (daysToTarget <= 42) {
      return "4-6_weeks";
    }
    return "6+_weeks";
  }

  // 3) Fallback based on band if no target date.
  if (band === "off_track") {
    return "2-6_weeks";
  }
  if (band === "at_risk") {
    return "2-6_weeks";
  }

  // Healthy or no data: keep tight horizon by default.
  return "0-2_weeks";
}

function computeLastMovementAt(epic, issues) {
  let latest = null;

  const consider = (d) => {
    if (!d) return;
    if (!latest || d > latest) latest = d;
  };

  if (Array.isArray(epic?.statusHistory)) {
    for (const h of epic.statusHistory) {
      if (h.to) consider(h.to);
    }
  }

  for (const issue of issues) {
    if (Array.isArray(issue.statusHistory)) {
      for (const h of issue.statusHistory) {
        if (h.to) consider(h.to);
      }
    }
  }

  return latest;
}

function buildSignalsSnapshot({
  totalStories,
  doneStories,
  inProgressStories,
  completionRatio,
  daysSinceMovement,
  daysToTarget,
  dailySignal,
}) {
  const snapshot = {
    totalStories,
    doneStories,
    inProgressStories,
    completionRatio,
    daysSinceMovement,
    daysToTarget,
  };

  // enrich snapshot from DailyEpicSignal for training / debugging
  if (dailySignal) {
    snapshot.openIssuesCount = dailySignal.openIssuesCount ?? null;
    snapshot.doneIssuesCount = dailySignal.doneIssuesCount ?? null;
    snapshot.inProgressIssuesCount = dailySignal.inProgressIssuesCount ?? null;
    snapshot.inReviewIssuesCount = dailySignal.inReviewIssuesCount ?? null;
    snapshot.storyPointsTotal = dailySignal.storyPointsTotal ?? null;
    snapshot.storyPointsCompleted = dailySignal.storyPointsCompleted ?? null;
    snapshot.newIssuesCreatedToday = dailySignal.newIssuesCreatedToday ?? null;
    snapshot.issuesStuckInReviewGt3d =
      dailySignal.issuesStuckInReviewGt3d ?? null;
  }

  return snapshot;
}
function buildConfidenceMeta({
  triggered,
  issues,
  dailySignal,
  weeklyCheckins,
}) {
  const safeTriggered = Array.isArray(triggered) ? triggered : [];

  // If engine has almost no signals, we are low-confidence.
  if (!safeTriggered.length) {
    const missingSignals = [];

    if (!issues || !issues.length) {
      missingSignals.push(
        "No linked issues or stories; prediction is based mostly on epic metadata."
      );
    }

    if (!dailySignal) {
      missingSignals.push(
        "No recent daily metrics for this epic; some risk signals may be missing."
      );
    }

    if (!weeklyCheckins || !weeklyCheckins.length) {
      missingSignals.push(
        "No weekly check-ins submitted yet; lead intent is unknown."
      );
    }

    return {
      confidence: 0.35,
      strongSignals: [],
      weakSignals: [],
      missingSignals,
    };
  }

  const maxPerSignal = 20; // from SIGNAL_DEFINITIONS weight range
  const totalAbs = safeTriggered.reduce(
    (sum, s) => sum + Math.abs(s.weight ?? 0),
    0
  );
  const theoreticalMax =
    maxPerSignal * safeTriggered.length > 0
      ? maxPerSignal * safeTriggered.length
      : 1;

  let raw = totalAbs / theoreticalMax;
  // Clamp into sane band
  const confidence = Math.max(0.4, Math.min(0.95, raw));

  const sorted = [...safeTriggered].sort(
    (a, b) => Math.abs(b.weight ?? 0) - Math.abs(a.weight ?? 0)
  );

  const STRONG_THRESHOLD = 8;

  const mapSignal = (s) => ({
    id: s.id,
    type: s.type,
    category: s.category,
    weight: s.weight,
    message: s.message,
  });

  const strongSignals = sorted
    .filter((s) => Math.abs(s.weight ?? 0) >= STRONG_THRESHOLD)
    .slice(0, 5)
    .map(mapSignal);

  const weakSignals = sorted
    .filter((s) => Math.abs(s.weight ?? 0) < STRONG_THRESHOLD)
    .slice(0, 10)
    .map(mapSignal);

  const missingSignals = [];
  if (!dailySignal) {
    missingSignals.push(
      "No recent daily metrics for this epic; CI/Jira/GitHub data might be incomplete."
    );
  }
  if (!weeklyCheckins || !weeklyCheckins.length) {
    missingSignals.push(
      "No weekly check-ins submitted; we have no explicit self-report from the lead."
    );
  }

  return { confidence, strongSignals, weakSignals, missingSignals };
}

function buildGenome({ epic, issues, dailySignal, summary }) {
  const {
    totalStories,
    doneStories,
    inProgressStories,
    completionRatio,
    daysSinceMovement,
    daysToTarget,
  } = summary;

  const hasOwner = !!(epic?.assignees && epic.assignees[0]?.accountId);
  const hasTargetDelivery = !!epic?.targetDelivery;
  const hasEstimates =
    Array.isArray(issues) && issues.some((i) => i.storyPoints != null);

  const workload = {
    totalStories,
    doneStories,
    inProgressStories,
    openIssuesCount: dailySignal?.openIssuesCount ?? null,
    inReviewIssuesCount: dailySignal?.inReviewIssuesCount ?? null,
  };

  const scope = {
    storyPointsTotal: dailySignal?.storyPointsTotal ?? null,
    storyPointsCompleted: dailySignal?.storyPointsCompleted ?? null,
    newIssuesCreatedToday: dailySignal?.newIssuesCreatedToday ?? null,
  };

  const movement = {
    daysSinceMovement,
    daysSinceLastDone: dailySignal?.daysSinceLastDone ?? null,
    daysToTarget,
  };

  const hygiene = {
    hasOwner,
    hasTargetDelivery,
    hasEstimates,
  };

  return {
    workload,
    scope,
    movement,
    hygiene,
  };
}
