// src/services/epicRiskService.js
import Epic from "../models/Epic.js";
import EpicWeeklyCheckin from "../models/EpicWeeklyCheckin.js";
import DailyEpicSignal from "../models/DailyEpicSignal.js";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import Issue from "../models/Issue.js";
import mongoose from "mongoose";
import { differenceInCalendarDays, subDays } from "date-fns"; // top of file
import {
  getRecoveryActions,
  estimateRecoveryEta,
} from "../prediction/recoveryPlaybook.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function mapWeeklyAnswerToRisk(leadAnswer) {
  switch (leadAnswer) {
    case "slip_3_plus":
      return { risk: 0.85, window: "Will slip >3 weeks" }; // very high
    case "slip_1_3":
      return { risk: 0.7, window: "Will slip 1–3 weeks" }; // high
    case "on_track":
      return { risk: 0.35, window: "On track" }; // slightly below healthy/amber boundary
    default:
      // No check-in / no answer: neutral-ish, slightly below 50
      return { risk: 0.45, window: "Unknown" }; // score = 45 → "healthy" unless other negatives push it up
  }
}

function classifyRiskBand(score) {
  if (score >= 65) return "red_zone"; // was 70
  if (score >= 50) return "at_risk";
  return "healthy";
}

// +ve = risk is going up (worse), -ve = going down (better)
function classifyRiskTrend(diff) {
  if (diff === null || diff === undefined || Number.isNaN(diff)) {
    return "no_data";
  }

  // Less than 5 points change → ignore as noise
  if (Math.abs(diff) < 5) {
    return "no_data";
  }

  if (diff >= 5) return "worsening"; // arrow up
  if (diff <= -5) return "improving"; // arrow down

  return "no_data";
}

// Map to simple arrow-friendly value for UI
function mapTrendToArrow(direction) {
  if (direction === "worsening") return "up";
  if (direction === "improving") return "down";
  return "unknown"; // no_data / missing
}

async function loadLatestWeeklyByEpic(workspaceId, epicIds) {
  if (!epicIds.length) return new Map();

  const wsId = new mongoose.Types.ObjectId(workspaceId);
  const epicObjIds = epicIds.map((id) => new mongoose.Types.ObjectId(id));

  const rows = await EpicWeeklyCheckin.aggregate([
    {
      $match: {
        workspaceId: wsId,
        epicId: { $in: epicObjIds },
      },
    },
    {
      $sort: {
        weekStart: -1,
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: "$epicId",
        doc: { $first: "$$ROOT" },
      },
    },
  ]);

  const map = new Map();
  for (const { _id, doc } of rows) {
    // Support both historical `leadAnswer` and new `status` field
    const leadAnswer = doc.leadAnswer || doc.status || null;

    map.set(String(_id), {
      epicId: doc.epicId,
      leadAnswer, // normalized value used everywhere else
      status: doc.status, // keep raw status around if you ever need it
      comment: doc.comment,
      weekStart: doc.weekStart,
    });
  }

  return map;
}

async function loadLatestDailyByEpic(workspaceId, epicIds) {
  if (!epicIds.length) return new Map();

  const wsId = new mongoose.Types.ObjectId(workspaceId);
  const epicObjIds = epicIds.map((id) => new mongoose.Types.ObjectId(id));

  const rows = await DailyEpicSignal.aggregate([
    {
      $match: {
        workspaceId: wsId,
        epicId: { $in: epicObjIds },
      },
    },
    {
      $sort: {
        date: -1,
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: "$epicId",
        doc: { $first: "$$ROOT" },
      },
    },
  ]);

  const map = new Map();
  for (const { _id, doc } of rows) {
    map.set(String(_id), doc);
  }
  return map;
}

async function loadLatestSnapshotsByEpic(epicIds) {
  if (!epicIds.length) {
    return { latestByEpic: new Map(), trendByEpic: new Map() };
  }

  const epicObjIds = epicIds.map((id) => new mongoose.Types.ObjectId(id));

  const rows = await PredictionSnapshot.aggregate([
    {
      $match: {
        epicId: { $in: epicObjIds },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: "$epicId",
        doc: { $first: "$$ROOT" },
        lastTwo: { $push: "$$ROOT" },
      },
    },
  ]);

  const latestByEpic = new Map();
  const trendByEpic = new Map();

  for (const { _id, doc, lastTwo } of rows) {
    latestByEpic.set(String(_id), doc);

    if (Array.isArray(lastTwo) && lastTwo.length >= 2) {
      const [latest, previous] = lastTwo;

      // probability is already 0–100
      const diff = (latest?.probability ?? 0) - (previous?.probability ?? 0);
      trendByEpic.set(String(_id), diff);
    } else {
      trendByEpic.set(String(_id), null);
    }
  }

  return { latestByEpic, trendByEpic };
}

function computeForecastWindow(epic, daily) {
  const isDone =
    epic.statusCategory === "done" ||
    ["Done", "Closed", "Cancelled"].includes(epic.state) ||
    epic.closedAt;

  if (isDone) return "Completed";
  if (!epic.targetDelivery) return "Unknown";

  const now = new Date();
  const target = new Date(epic.targetDelivery);
  const daysToTarget = Math.round((target - now) / MS_PER_DAY);

  if (Number.isNaN(daysToTarget)) return "Unknown";

  if (daysToTarget < 0) return "Past due";

  // primary: days until target
  if (daysToTarget <= 14) return "0–2 weeks";
  if (daysToTarget <= 28) return "2–4 weeks";
  if (daysToTarget <= 42) return "4–6 weeks";
  return "6+ weeks";
}

function groupIssuesByEpic(issues) {
  const map = new Map();
  for (const issue of issues) {
    const id = String(issue.epicId);
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(issue);
  }
  return map;
}

export async function getEpicRiskForWorkspace(workspaceId) {
  const epics = await Epic.find({ workspaceId }).sort({ updatedAt: -1 });

  if (!epics.length) {
    return {
      epics: [],
      summary: { total: 0, healthy: 0, atRisk: 0, redZone: 0 },
    };
  }

  const epicIds = epics.map((e) => e._id);

  const [weeklyByEpic, dailyByEpic, snapshotData, issues, teamPerfList] =
    await Promise.all([
      loadLatestWeeklyByEpic(workspaceId, epicIds),
      loadLatestDailyByEpic(workspaceId, epicIds),
      loadLatestSnapshotsByEpic(epicIds),
      Issue.find(
        {
          workspaceId,
          epicId: { $in: epicIds },
        },
        { epicId: 1, statusHistory: 1 }
      ).lean(),
      getTeamPerformanceForWorkspace(workspaceId),
    ]);

  const issuesByEpic = groupIssuesByEpic(issues);

  const latestByEpic = snapshotData.latestByEpic;
  const trendByEpic = snapshotData.trendByEpic;

  const teamPerfByKey = new Map();
  if (Array.isArray(teamPerfList)) {
    for (const t of teamPerfList) {
      if (!t?.key) continue;
      teamPerfByKey.set(t.key, t);
    }
  }

  const results = [];

  for (const epic of epics) {
    const epicIdStr = String(epic._id);
    const weekly = weeklyByEpic.get(epicIdStr) || null;
    const daily = dailyByEpic.get(epicIdStr) || null;
    const snapshot = latestByEpic.get(epicIdStr) || null;
    const riskTrend = trendByEpic.get(epicIdStr) ?? 0;
    const trendDirection = classifyRiskTrend(riskTrend);
    const trend = mapTrendToArrow(trendDirection);
    // ----- Prediction Intelligence (from latest PredictionSnapshot) -----
    const predictionIntelligence = snapshot
      ? {
          confidence: snapshot.confidence ?? null,
          strongSignals: snapshot.strongSignals || [],
          weakSignals: snapshot.weakSignals || [],
          missingSignals: snapshot.missingSignals || [],
          genome: snapshot.genome || null,
        }
      : {
          confidence: null,
          strongSignals: [],
          weakSignals: [],
          missingSignals: [],
          genome: null,
        };

    const epicIssues = issuesByEpic.get(epicIdStr) || [];
    const teamKey =
      epic.team?.key ||
      epic.teamKey ||
      epic.team?.name ||
      epic.projectKey ||
      epic.project ||
      "Unassigned";

    const teamName =
      epic?.team ||
      epic?.team?.name ||
      epic?.teamName ||
      epic?.projectName ||
      teamKey;

    const teamMetrics = teamPerfByKey.get(teamKey) || null;

    // ========= COMPLETED EPICS (override) =========
    const isCompleted =
      epic.statusCategory === "done" ||
      ["Done", "Closed", "Cancelled"].includes(epic.state) ||
      !!epic.closedAt;

    if (isCompleted) {
      const reasons = ["Epic is completed."];

      let riskScore = 5;
      const now = new Date();
      const closedAt = epic.closedAt || epic.updatedAt || now;

      if (epic.targetDelivery) {
        const target = new Date(epic.targetDelivery);
        const daysLate = Math.floor((closedAt - target) / MS_PER_DAY);

        if (daysLate > 0) {
          if (daysLate <= 7) {
            riskScore = 20;
          } else if (daysLate <= 21) {
            riskScore = 30;
          } else {
            riskScore = 40;
          }
          reasons.push(`Epic completed ${daysLate} day(s) after target date`);
        } else if (daysLate < 0) {
          reasons.push(
            `Epic completed ${Math.abs(daysLate)} day(s) before target date`
          );
        }
      }

      if (snapshot && Array.isArray(snapshot.reasons)) {
        for (const r of snapshot.reasons) {
          const trimmed = typeof r === "string" ? r.trim() : "";
          if (!trimmed) continue;
          const labelled = `Prediction: ${trimmed}`;
          if (!reasons.includes(labelled)) {
            reasons.push(labelled);
          }
        }
      }

      // normalise to 0–100, classify band
      const score = Math.max(0, Math.min(riskScore, 100));
      const band = classifyRiskBand(score);
      const windowLabel = "Completed";

      const reasonsForUi = [...reasons];

      const severity = classifyRecoverySeverity(score, band);
      const slipType = classifySlipType({
        score,
        band,
        reasons: reasonsForUi,
        weekly: null,
      });
      const actions = getRecoveryActions(slipType, severity);
      const recoveryETA = estimateRecoveryEta({
        slipType,
        severity,
        band,
        score,
      });

      const recovery = {
        slipType,
        severity,
        actions,
        recoveryETA,
      };

      const riskSummary = {
        score,
        band,
        window: windowLabel,
        reasons: reasonsForUi,
        riskTrend,
        trendDirection,
        trend,
      };

      results.push({
        id: epic._id.toString(),
        epicId: epic._id,
        key: epic.key,
        title: epic.title,
        state: epic.state,
        statusCategory: epic.statusCategory,
        isActive: epic.isActive,
        startedAt: epic.startedAt,
        targetDelivery: epic.targetDelivery,

        riskScore: score,
        band,
        window: windowLabel,
        reasons: reasonsForUi,
        riskTrend,
        trendDirection,
        trend,
        riskSummary,
        recovery,

        // NEW: prediction intelligence snapshot
        predictionIntelligence,

        team: {
          key: teamKey,
          name: teamName,
          metrics: teamMetrics,
        },
      });

      continue;
    }

    // ========= WEEKLY + BASE RISK =========
    const { risk: baseRisk, window } = mapWeeklyAnswerToRisk(
      weekly?.leadAnswer
    );
    let risk = baseRisk;
    const riskReasons = [];
    let genericWeeklyReasonNeeded = false;

    if (weekly?.leadAnswer === "slip_3_plus") {
      riskReasons.push("Lead says: will slip more than 3 weeks");
    } else if (weekly?.leadAnswer === "slip_1_3") {
      riskReasons.push("Lead says: will slip 1–3 weeks");
    } else if (weekly?.leadAnswer === "on_track") {
      riskReasons.push("Lead says: on track");
    } else {
      genericWeeklyReasonNeeded = true;
    }

    // ========= DAILY SIGNALS + COMPLETION =========
    const now = new Date();
    let completion = 0;

    if (daily) {
      const open = daily.openIssuesCount ?? 0;
      const done = daily.doneIssuesCount ?? 0;
      const total = open + done;

      if (total > 0) {
        completion = done / total;

        if (completion < 0.3) {
          // truly bad → penalise
          risk += 0.1;
          riskReasons.push("Low completion of issues (<30%).");
        } else if (completion < 0.6) {
          // neutral – neither bonus nor penalty
          riskReasons.push(
            "Medium completion of issues (30–60%); neutral signal for now."
          );
        } else if (completion > 0.9) {
          // very good → small bonus
          risk -= 0.05;
          riskReasons.push("High completion of issues (>90%).");
        }
      }

      const stale = daily.staleIssuesOver7dCount ?? 0;
      if (stale > 0) {
        risk += 0.1;
        riskReasons.push("Has stale issues (>7 days without movement)");
      }

      if (epic.targetDelivery && total > 0) {
        const target = new Date(epic.targetDelivery);
        const daysToTarget = Math.floor((target - now) / MS_PER_DAY);
        if (daysToTarget <= 14 && daysToTarget >= 0 && completion < 0.5) {
          risk += 0.1;
          riskReasons.push(
            `Epic due in ${daysToTarget} day(s) with low completion`
          );
        }
      }

      if (completion >= 0.6 && (daily.staleIssuesOver7dCount ?? 0) === 0) {
        risk -= 0.05;
        riskReasons.push(
          "Good completion so far and no stale issues in the last 7 days"
        );
      }
    } else {
      risk += 0.1;
      riskReasons.push("No daily signals available for this epic");
    }

    // ========= STUCK ISSUES (statusHistory) =========
    let stuckCount = 0;
    for (const issue of epicIssues) {
      const hist = issue.statusHistory || [];
      if (!hist.length) continue;
      const current = hist[hist.length - 1];
      if (current?.category === "in_progress" && !current.to) {
        const from = current.from ? new Date(current.from) : null;
        if (from) {
          const daysInStatus = Math.floor((now - from) / MS_PER_DAY);
          if (daysInStatus >= 5) stuckCount += 1;
        }
      }
    }
    if (stuckCount > 0) {
      risk += 0.1;
      riskReasons.push(`${stuckCount} issue(s) stuck In Progress for ≥5 days`);
    }

    // ========= DUE-DATE PENALTY (over-due) =========
    if (epic.targetDelivery && !epic.closedAt) {
      const target = new Date(epic.targetDelivery);
      const daysLate = Math.floor((now - target) / MS_PER_DAY);

      if (daysLate > 0) {
        if (daysLate > 21) {
          risk += 0.4; // was 0.3
          riskReasons.push(`Epic overdue by ${daysLate} days`);
        } else if (daysLate > 7) {
          risk += 0.25; // was 0.2
          riskReasons.push(`Epic overdue by ${daysLate} days`);
        } else {
          risk += 0.15; // was 0.1
          riskReasons.push(`Epic slightly overdue (${daysLate} days)`);
        }
      }
    }

    if (genericWeeklyReasonNeeded) {
      let activeDays = null;
      if (epic.startedAt instanceof Date) {
        activeDays = differenceInCalendarDays(now, epic.startedAt);
      }

      let daysToTarget = null;
      if (epic.targetDelivery) {
        const target = new Date(epic.targetDelivery);
        daysToTarget = Math.floor((target - now) / MS_PER_DAY);
      }

      const isOldEnough = activeDays === null || activeDays >= 7;
      const isNotFarFuture = daysToTarget === null || daysToTarget <= 28; // only nag inside ~4 weeks

      if (isOldEnough && isNotFarFuture) {
        riskReasons.push("No weekly check-in from lead");
      }
    }

    // ========= FINAL REASONS (base + model) =========
    const finalReasons = [];

    for (const r of riskReasons) {
      const trimmed = typeof r === "string" ? r.trim() : "";
      if (trimmed && !finalReasons.includes(trimmed)) {
        finalReasons.push(trimmed);
      }
    }

    if (snapshot && Array.isArray(snapshot.reasons)) {
      for (const r of snapshot.reasons) {
        const trimmed = typeof r === "string" ? r.trim() : "";
        if (!trimmed) continue;
        const labelled = `Prediction: ${trimmed}`;
        if (!finalReasons.includes(labelled)) {
          finalReasons.push(labelled);
        }
      }
    }

    // ========= SCORE & BAND (0–100) =========
    risk = Math.max(0, Math.min(risk, 1));
    const score = Math.round(risk * 100);
    const band = classifyRiskBand(score);

    // ========= WINDOW LABEL =========
    let windowLabel = computeForecastWindow(epic, daily);
    if (!windowLabel || windowLabel === "Unknown") {
      windowLabel = window || "Unknown";
    }

    // ========= QUIET HEALTHY EXPLANATION =========
    let reasonsForUi = [...finalReasons];

    if (band === "healthy") {
      const lowerReasons = reasonsForUi.map((r) => r.toLowerCase());

      const hasOverdue = lowerReasons.some(
        (r) => r.includes("overdue") || r.includes("past due")
      );
      const hasHardSlip = lowerReasons.some(
        (r) =>
          r.includes("slip more than 3 weeks") || r.includes("slip 1–3 weeks")
      );

      if (!hasOverdue && !hasHardSlip) {
        reasonsForUi.unshift(
          "Quietly healthy: steady movement, no major red flags, but not enough data to call it rock solid."
        );
      }
    }

    const severity = classifyRecoverySeverity(score, band);
    const slipType = classifySlipType({
      score,
      band,
      reasons: reasonsForUi,
      weekly,
    });
    const actions = getRecoveryActions(slipType, severity);
    const recoveryETA = estimateRecoveryEta({
      slipType,
      severity,
      band,
      score,
    });
    const recovery = {
      slipType,
      severity,
      actions,
      recoveryETA,
    };

    const riskSummary = {
      score,
      band,
      window: windowLabel,
      reasons: reasonsForUi,
      riskTrend,
      trendDirection,
      trend,
    };

    results.push({
      id: epic._id.toString(),
      epicId: epic._id,
      key: epic.key,
      title: epic.title,
      state: epic.state,
      statusCategory: epic.statusCategory,
      isActive: epic.isActive,
      startedAt: epic.startedAt,
      targetDelivery: epic.targetDelivery,

      riskScore: score,
      band,
      window: windowLabel,
      reasons: reasonsForUi,
      riskTrend,
      trendDirection,
      trend,
      riskSummary,
      recovery,
      weeklyCheckin: weekly
        ? {
            latestStatus: weekly.leadAnswer,
            confidence: weekly.confidence,
            comment: weekly.comment,
            weekStart: weekly.weekStart,
          }
        : null,

      // NEW: prediction intelligence snapshot
      predictionIntelligence,

      team: {
        key: teamKey,
        name: teamName,
        metrics: teamMetrics,
      },
    });
  }

  const total = results.length;
  const healthy = results.filter((e) => e.band === "healthy").length;
  const atRisk = results.filter((e) => e.band === "at_risk").length;
  const redZone = results.filter((e) => e.band === "red_zone").length;

  return {
    epics: results,
    summary: { total, healthy, atRisk, redZone },
  };
}

export async function getEpicSignalsForEpic(workspaceId, epicId) {
  if (!workspaceId || !epicId) return null;

  const wsId = new mongoose.Types.ObjectId(workspaceId);
  const epicObjId = new mongoose.Types.ObjectId(epicId);

  // Make sure epic belongs to this workspace
  const epicDoc = await Epic.findOne({
    _id: epicObjId,
    workspaceId: wsId,
  }).lean();

  if (!epicDoc) {
    return null;
  }

  // Re-use the existing risk engine so reasons/band/window stay consistent
  const riskResult = await getEpicRiskForWorkspace(workspaceId);

  const [weeklyCheckins, dailySignals, snapshots] = await Promise.all([
    EpicWeeklyCheckin.find({ workspaceId: wsId, epicId: epicObjId })
      .sort({ weekStart: -1, createdAt: -1 })
      .limit(10)
      .lean(),
    DailyEpicSignal.find({ workspaceId: wsId, epicId: epicObjId })
      .sort({ date: -1, createdAt: -1 })
      .limit(30)
      .lean(),
    PredictionSnapshot.find({ epicId: epicObjId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
  ]);
  const epicRisk = riskResult.epics.find(
    (e) => String(e.id) === String(epicId)
  );

  return {
    epicId: String(epicDoc._id),
    key: epicDoc.key,
    title: epicDoc.title,
    state: epicDoc.state,
    statusCategory: epicDoc.statusCategory,

    riskScore: epicRisk?.riskScore ?? null,
    band: epicRisk?.band ?? null,
    window: epicRisk?.window ?? null,
    reasons: epicRisk?.reasons ?? [],

    riskTrend: epicRisk?.riskTrend ?? null,
    trendDirection: epicRisk?.trendDirection ?? null,
    trend: epicRisk?.trend ?? null,

    // NEW: prediction intelligence for the epic details screen
    predictionIntelligence: epicRisk?.predictionIntelligence || null,

    weeklyCheckins,
    dailySignals,
    snapshots,
  };
}
function classifyRecoverySeverity(score, band) {
  // score is 0–100 risk, higher = worse
  if (band === "off_track" || band === "critical") {
    if (score >= 85) return "critical";
    if (score >= 70) return "high";
    return "moderate";
  }

  if (band === "at_risk") {
    if (score >= 70) return "high";
    if (score >= 55) return "moderate";
    return "low";
  }

  // on_track / healthy / no_data
  if (score >= 55) return "low";
  return "none";
}

function classifySlipType({ score, band, reasons, weekly }) {
  const reasonsText = Array.isArray(reasons)
    ? reasons.join(" ").toLowerCase()
    : "";

  const latestWeeklyStatus = weekly?.leadAnswer || null;

  // 1) If epic looks healthy, no slip type needed.
  if (band === "on_track" || band === "healthy") {
    return "none";
  }

  // 2) Lead / weekly-related uncertainty.
  if (!weekly && score >= 70) {
    return "lead_uncertainty";
  }
  if (
    latestWeeklyStatus === "on_track" &&
    (reasonsText.includes("overdue") || reasonsText.includes("past due"))
  ) {
    // Lead said on track but signals disagree.
    return "lead_misalignment";
  }

  // 3) Scope creep indicators.
  if (
    reasonsText.includes("scope") ||
    reasonsText.includes("new stories were added") ||
    reasonsText.includes("more stories were added") ||
    reasonsText.includes("story points increased")
  ) {
    return "scope_creep";
  }

  // 4) Dependency / blocked indicators.
  if (
    reasonsText.includes("blocked") ||
    reasonsText.includes("dependency") ||
    reasonsText.includes("waiting on")
  ) {
    return "dependency_blocked";
  }

  // 5) Stagnant work / no movement.
  if (
    reasonsText.includes("no recent movement") ||
    reasonsText.includes("has not moved") ||
    reasonsText.includes("stuck in the same status")
  ) {
    return "stagnant_work";
  }

  // 6) No stories, no clear plan, high risk.
  if (
    reasonsText.includes("no stories linked") ||
    reasonsText.includes("no stories are linked")
  ) {
    return "no_plan";
  }

  // 7) High risk but no specific pattern matched.
  if (score >= 70) {
    return "generic_high_risk";
  }

  // Default fallback.
  return "unknown";
}

export async function getAssigneePerformanceForEpic(workspaceId, epicId) {
  if (!workspaceId || !epicId) {
    return { epicId, assignees: [] };
  }

  const wsId = new mongoose.Types.ObjectId(workspaceId);
  const epicObjId = new mongoose.Types.ObjectId(epicId);

  // Pull all issues for this epic
  const issues = await Issue.find({
    workspaceId: wsId,
    epicId: epicObjId,
  }).lean();

  if (!issues.length) {
    return { epicId, assignees: [] };
  }

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  const metricsByAssignee = new Map();

  for (const issue of issues) {
    // Jira sync stores a single assignee object
    const assignee = issue.assignee || null;

    const key = assignee?.accountId || "unassigned";
    const name = assignee?.displayName || "Unassigned";
    const email = assignee?.email || assignee?.emailAddress || null;

    if (!metricsByAssignee.has(key)) {
      metricsByAssignee.set(key, {
        key,
        name,
        email,

        totalIssues: 0,
        doneIssues: 0,
        inProgressIssues: 0,
        todoIssues: 0,

        resolvedLast30: 0,
        openIssues: 0,

        // For cycle time
        doneWithCycle: 0,
        totalCycleDays: 0,
      });
    }

    const entry = metricsByAssignee.get(key);

    entry.totalIssues += 1;

    const statusCategory = (issue.statusCategory || "").toLowerCase();
    const isDone = statusCategory === "done";
    const isInProgress =
      statusCategory === "in_progress" || statusCategory === "review";

    if (isDone) {
      entry.doneIssues += 1;
    } else if (isInProgress) {
      entry.inProgressIssues += 1;
    } else {
      entry.todoIssues += 1;
    }

    if (!isDone) {
      entry.openIssues += 1;
    }

    // Resolved in last 30 days
    if (isDone && issue.resolvedAt instanceof Date) {
      if (issue.resolvedAt >= thirtyDaysAgo && issue.resolvedAt <= now) {
        entry.resolvedLast30 += 1;
      }
    }

    // Cycle time: simple created -> resolved
    const created =
      issue.createdAtJira ||
      issue.createdAt ||
      (issue._id?.getTimestamp ? issue._id.getTimestamp() : null);
    const doneAt =
      issue.resolvedAt || issue.updatedAtJira || issue.updatedAt || created;

    if (isDone && created && doneAt && doneAt > created) {
      const createdDate = created instanceof Date ? created : new Date(created);
      const doneDate = doneAt instanceof Date ? doneAt : new Date(doneAt);

      const diffMs = doneDate.getTime() - createdDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      entry.doneWithCycle += 1;
      entry.totalCycleDays += diffDays;
    }
  }

  const assignees = Array.from(metricsByAssignee.values()).map((entry) => {
    const avgCycleTimeDays =
      entry.doneWithCycle > 0
        ? Number((entry.totalCycleDays / entry.doneWithCycle).toFixed(1))
        : null;

    // Simple reliability: how much this person closes in last 30d vs how much is still open
    const denom = entry.openIssues + entry.resolvedLast30 || 1;
    const reliabilityScoreRaw = denom > 0 ? entry.resolvedLast30 / denom : 0;
    const reliabilityScore = Math.round(reliabilityScoreRaw * 100);

    return {
      key: entry.key,
      name: entry.name,
      email: entry.email,

      totalIssues: entry.totalIssues,
      doneIssues: entry.doneIssues,
      inProgressIssues: entry.inProgressIssues,
      todoIssues: entry.todoIssues,

      resolvedLast30: entry.resolvedLast30,
      openIssues: entry.openIssues,

      avgCycleTimeDays,
      reliabilityScore,
    };
  });

  // Sort: most involved on this epic first
  assignees.sort((a, b) => b.totalIssues - a.totalIssues);

  return {
    epicId,
    assignees,
  };
}

export async function getEpicHealthForEpic(workspaceId, epicId) {
  const epic = await Epic.findOne({
    _id: epicId,
    workspaceId,
  }).lean();

  if (!epic) return null;

  const now = new Date();
  const ninetyDaysAgo = subDays(now, 90);
  const sevenDaysAgo = subDays(now, 7);

  // --- Epic issues ---
  const issues = await Issue.find({
    workspaceId,
    epicId,
  }).lean();

  const totalIssues = issues.length;
  const doneIssues = issues.filter(
    (i) => i.statusCategory === "done" || i.status === "Done"
  ).length;
  const openIssues = totalIssues - doneIssues;

  const completionPercent =
    totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

  // --- Schedule / dates ---
  const target =
    epic.targetDelivery || epic.deadline || epic.dueDate || epic.due || null;

  let scheduleStatus = "no_target"; // "overdue" | "on_track" | "no_target"
  let daysOverdue = null;
  let daysToDue = null;

  if (target) {
    const diff = differenceInCalendarDays(now, target);
    if (diff > 0) {
      scheduleStatus = "overdue";
      daysOverdue = diff;
    } else {
      scheduleStatus = "on_track";
      daysToDue = Math.abs(diff);
    }
  }

  const startedAt = epic.startedAt || epic.createdAt;
  let issuesAddedAfterStart = 0;
  if (startedAt) {
    issuesAddedAfterStart = issues.filter(
      (i) => i.createdAtJira && i.createdAtJira > startedAt
    ).length;
  }

  // --- Freshness / last activity ---
  let lastIssueUpdatedAt = null;
  for (const i of issues) {
    const candidate = i.updatedAtJira || i.updatedAt;
    if (!candidate) continue;
    if (!lastIssueUpdatedAt || candidate > lastIssueUpdatedAt) {
      lastIssueUpdatedAt = candidate;
    }
  }

  let staleDays = null;
  if (lastIssueUpdatedAt) {
    staleDays = differenceInCalendarDays(now, lastIssueUpdatedAt);
  }

  const issuesTouchedLast7d = issues.filter(
    (i) =>
      (i.updatedAtJira && i.updatedAtJira >= sevenDaysAgo) ||
      (i.updatedAt && i.updatedAt >= sevenDaysAgo)
  ).length;

  // --- Cycle time (epic) ---
  const epicCycleTimes = [];
  for (const i of issues) {
    const created = i.createdAtJira || i.createdAt;
    const resolved = i.resolvedAtJira || i.resolvedAt;
    if (!created || !resolved) continue;
    const days = Math.max(0, differenceInCalendarDays(resolved, created));
    if (!Number.isNaN(days)) {
      epicCycleTimes.push(days);
    }
  }

  const avgCycleTimeEpicDays =
    epicCycleTimes.length > 0
      ? epicCycleTimes.reduce((a, b) => a + b, 0) / epicCycleTimes.length
      : null;

  // --- Workspace baseline cycle time & throughput ---
  const workspaceDoneIssues = await Issue.find({
    workspaceId,
    statusCategory: "done",
    resolvedAtJira: { $gte: ninetyDaysAgo },
  })
    .select("createdAtJira resolvedAtJira")
    .lean();

  const workspaceCycleTimes = [];
  for (const i of workspaceDoneIssues) {
    if (!i.createdAtJira || !i.resolvedAtJira) continue;
    const days = Math.max(
      0,
      differenceInCalendarDays(i.resolvedAtJira, i.createdAtJira)
    );
    if (!Number.isNaN(days)) {
      workspaceCycleTimes.push(days);
    }
  }

  const cycleTimeBaselineDays =
    workspaceCycleTimes.length > 0
      ? workspaceCycleTimes.reduce((a, b) => a + b, 0) /
        workspaceCycleTimes.length
      : null;

  // Throughput for this epic – last 7 days
  const throughputLast7Days = issues.filter((i) => {
    const resolved = i.resolvedAtJira || i.resolvedAt;
    if (!resolved) return false;
    return resolved >= sevenDaysAgo;
  }).length;

  // Workspace throughput baseline (per week) – last 60 days
  const sixtyDaysAgo = subDays(now, 60);
  const workspaceDoneLast60 = await Issue.find({
    workspaceId,
    statusCategory: "done",
    resolvedAtJira: { $gte: sixtyDaysAgo },
  })
    .select("resolvedAtJira")
    .lean();

  const throughputBaselinePerWeek =
    workspaceDoneLast60.length > 0
      ? (workspaceDoneLast60.length / 60) * 7 // issues per week
      : null;

  // --- Scope creep percentage ---
  const scopeCreepPercent =
    totalIssues > 0
      ? Math.round((issuesAddedAfterStart / totalIssues) * 100)
      : 0;

  // --- Freshness score 0–100 (simple banded model) ---
  let freshnessScore = null;
  if (staleDays == null) {
    freshnessScore = null;
  } else if (staleDays <= 1) {
    freshnessScore = 100;
  } else if (staleDays <= 7) {
    freshnessScore = 80;
  } else if (staleDays <= 14) {
    freshnessScore = 60;
  } else if (staleDays <= 30) {
    freshnessScore = 40;
  } else {
    freshnessScore = 20;
  }

  const isCompleted =
    epic.statusCategory === "done" ||
    epic.state === "Done" ||
    !!epic.closedAt ||
    epic.isActive === false;

  return {
    epicId: epic._id,
    statusCategory: epic.statusCategory || null,
    isCompleted,
    totalIssues,
    doneIssues,
    openIssues,
    completionPercent,
    scheduleStatus,
    daysOverdue,
    daysToDue,
    issuesAddedAfterStart,
    lastIssueUpdatedAt,
    staleDays,
    issuesTouchedLast7d,
    avgCycleTimeEpicDays,
    cycleTimeBaselineDays,
    throughputLast7Days,
    throughputBaselinePerWeek,
    scopeCreepPercent,
    freshnessScore,
  };
}
export async function getTeamPerformanceForWorkspace(workspaceId) {
  if (!workspaceId) {
    return [];
  }

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const sixtyDaysAgo = subDays(now, 60);

  // Pull all issues for this workspace
  const issues = await Issue.find({
    workspaceId,
  }).lean();

  if (!issues.length) {
    return [];
  }

  const metricsByTeam = new Map();

  const getTeamKeyAndName = (issue) => {
    const teamKey =
      issue.team?.key ||
      issue.teamKey ||
      issue.team?.name ||
      issue.projectKey ||
      issue.project ||
      "Unassigned";

    const teamName =
      issue.team?.name || issue.teamName || issue.projectName || teamKey;

    return { teamKey, teamName };
  };

  for (const issue of issues) {
    const { teamKey, teamName } = getTeamKeyAndName(issue);

    if (!metricsByTeam.has(teamKey)) {
      metricsByTeam.set(teamKey, {
        key: teamKey,
        name: teamName,

        totalIssues: 0,
        doneIssues: 0,
        openIssues: 0,

        resolvedLast7: 0,
        resolvedLast60: 0,

        doneWithCycle: 0,
        totalCycleDays: 0,
      });
    }

    const entry = metricsByTeam.get(teamKey);

    entry.totalIssues += 1;

    const statusCategory = (issue.statusCategory || "").toLowerCase();
    const isDone = statusCategory === "done" || issue.status === "Done";

    if (isDone) {
      entry.doneIssues += 1;
    } else {
      entry.openIssues += 1;
    }

    const resolved =
      issue.resolvedAtJira || issue.resolvedAt || issue.updatedAtJira || null;

    if (isDone && resolved instanceof Date) {
      if (resolved >= sevenDaysAgo && resolved <= now) {
        entry.resolvedLast7 += 1;
      }

      if (resolved >= sixtyDaysAgo && resolved <= now) {
        entry.resolvedLast60 += 1;
      }
    }

    const created = issue.createdAtJira || issue.createdAt || null;

    if (isDone && created && resolved && resolved > created) {
      const createdDate = created instanceof Date ? created : new Date(created);
      const doneDate = resolved instanceof Date ? resolved : new Date(resolved);

      const diffDays = differenceInCalendarDays(doneDate, createdDate);

      if (!Number.isNaN(diffDays) && diffDays >= 0) {
        entry.doneWithCycle += 1;
        entry.totalCycleDays += diffDays;
      }
    }
  }

  const teams = Array.from(metricsByTeam.values()).map((entry) => {
    const avgCycleTimeDays =
      entry.doneWithCycle > 0
        ? Number((entry.totalCycleDays / entry.doneWithCycle).toFixed(1))
        : null;

    const throughputLast7Days = entry.resolvedLast7;

    const throughputBaselinePerWeek =
      entry.resolvedLast60 > 0
        ? Number(((entry.resolvedLast60 / 60) * 7).toFixed(1))
        : null;

    return {
      key: entry.key,
      name: entry.name,
      totalIssues: entry.totalIssues,
      doneIssues: entry.doneIssues,
      openIssues: entry.openIssues,
      avgCycleTimeDays,
      throughputLast7Days,
      throughputBaselinePerWeek,
    };
  });

  // Biggest / busiest teams first
  teams.sort((a, b) => b.doneIssues - a.doneIssues);

  return teams;
}
