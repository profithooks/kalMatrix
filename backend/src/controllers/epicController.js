import Epic from "../models/Epic.js";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import Issue from "../models/Issue.js";
import { logError } from "../utils/logger.js";
import EpicOutcome from "../models/EpicOutcome.js";
import DailyEpicSignal from "../models/DailyEpicSignal.js";
import EpicWeeklyCheckin from "../models/EpicWeeklyCheckin.js";
import { evaluateEpicSignals } from "../prediction/evaluateEpicSignals.js";
import { startOfDay, subDays } from "date-fns";

// Temporary: return mock epic list + mock prediction snapshot
export const getEpicsWithPrediction = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    // Pagination params (page 1-based)
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit, 10) || 50;
    const limit = Math.min(Math.max(limitRaw, 1), 100); // cap 100
    const skip = (page - 1) * limit;

    // Total count for headers
    const total = await Epic.countDocuments({ workspaceId });

    // 1) Load epics page for this workspace
    const epics = await Epic.find({ workspaceId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (!epics.length) {
      // Set headers even if empty
      res.set("X-Total-Count", String(total));
      res.set("X-Page", String(page));
      res.set("X-Limit", String(limit));
      return res.json([]);
    }

    const epicIds = epics.map((e) => e._id);

    // 2) Load latest prediction per epic in ONE query
    const snapshots = await PredictionSnapshot.aggregate([
      {
        $match: {
          epicId: { $in: epicIds },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$epicId",
          doc: { $first: "$$ROOT" },
        },
      },
    ]);

    const predictionByEpicId = new Map();
    for (const row of snapshots) {
      predictionByEpicId.set(String(row._id), row.doc);
    }

    // 3) Build result in the SAME SHAPE as before
    const result = epics.map((epic) => {
      const prediction = predictionByEpicId.get(String(epic._id)) || null;
      return {
        epic,
        prediction,
      };
    });

    // Add pagination metadata via headers (non-breaking)
    res.set("X-Total-Count", String(total));
    res.set("X-Page", String(page));
    res.set("X-Limit", String(limit));

    return res.json(result);
  } catch (err) {
    logError("getEpicsWithPrediction error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

export const getEpicRiskSummary = async (req, res) => {
  try {
    const workspaceId = req.user?.workspaceId;

    if (!workspaceId) {
      return res
        .status(401)
        .json({ ok: false, error: "Workspace not found on user" });
    }

    const epics = await Epic.find({ workspaceId })
      .sort({ createdAt: -1 })
      .lean();

    if (!epics.length) {
      return res.json({ epics: [], summary: null });
    }

    const epicIds = epics.map((e) => e._id);

    const snapshots = await PredictionSnapshot.find({
      epicId: { $in: epicIds },
      workspaceId,
    })
      .sort({ createdAt: -1 })
      .lean();

    const latestByEpic = new Map();
    for (const snap of snapshots) {
      const key = String(snap.epicId);
      if (!latestByEpic.has(key)) latestByEpic.set(key, snap);
    }

    const items = [];
    let healthy = 0;
    let atRisk = 0;
    let redZone = 0;
    let totalProb = 0;

    for (const epic of epics) {
      const snap = latestByEpic.get(String(epic._id));

      // probability stored as 0–100 in DB
      const riskScore = snap?.probability ?? 50; // 0–100

      let bucket = "healthy";
      if (riskScore >= 65) bucket = "red_zone";
      else if (riskScore >= 50) bucket = "at_risk";

      if (bucket === "red_zone") redZone++;
      else if (bucket === "at_risk") atRisk++;
      else healthy++;

      totalProb += riskScore;

      const reasons = snap?.reasons || [];
      const signals = reasons.map((r) => ({
        type: "reason",
        level: bucket,
        message: r,
      }));

      items.push({
        id: epic._id.toString(),
        name: epic.title,
        riskScore,
        predictionWindowWeeks: { min: 2, max: 6 },
        signals,
        team: epic.team || "Unassigned",
      });
    }

    const summary = {
      totalEpics: items.length,
      healthy,
      atRisk,
      redZone,
      avgProbability: items.length ? Math.round(totalProb / items.length) : 0,
    };

    return res.json({ epics: items, summary });
  } catch (err) {
    logError("getEpicRiskSummary error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

// src/controllers/jiraEpicController.js

export const getEpicJiraDetail = async (req, res) => {
  try {
    const { workspaceId, epicId } = req.params;

    const epic = await Epic.findOne({ _id: epicId, workspaceId });
    if (!epic) {
      return res.status(404).json({ ok: false, error: "Epic not found" });
    }

    const issues = await Issue.find({ epicId: epic._id })
      .sort({ "fields.rank": 1, createdAtJira: 1 })
      .lean();

    // group subtasks under parent
    const byKey = new Map();
    issues.forEach((i) => byKey.set(i.key, i));

    const topLevel = [];
    issues.forEach((i) => {
      if (i.parentKey && byKey.has(i.parentKey)) {
        const parent = byKey.get(i.parentKey);
        if (!parent.subtasks) parent.subtasks = [];
        parent.subtasks.push(i);
      } else {
        topLevel.push(i);
      }
    });

    return res.json({
      ok: true,
      epic: {
        id: epic._id.toString(),
        key: epic.key,
        title: epic.title,
        state: epic.state,
        statusHistory: epic.statusHistory,
        startedAt: epic.startedAt,
        closedAt: epic.closedAt,
        url: epic.url,
      },
      issues: topLevel,
    });
  } catch (err) {
    logError("getEpicJiraDetail error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function firstStatusTime(history, category) {
  if (!Array.isArray(history) || !history.length) return null;
  const match = history
    .filter((h) => h.category === category && h.from)
    .sort((a, b) => a.from - b.from)[0];
  return match ? match.from : null;
}

function lastStatusTime(history, category) {
  if (!Array.isArray(history) || !history.length) return null;
  const match = history
    .filter((h) => h.category === category && (h.to || h.from))
    .sort((a, b) => (b.to || b.from) - (a.to || a.from))[0];
  return match ? match.to || match.from : null;
}

function computeOutcomeBandFromSlipDays(slipDays) {
  if (slipDays == null || slipDays <= 0) return "on_time";
  const weeks = slipDays / 7;
  if (weeks <= 3) return "slip_1_3";
  return "slip_3_plus";
}
export const getEpicSlipChain = async (req, res) => {
  try {
    const workspaceId = req.user?.workspaceId;
    const { epicId } = req.params;

    if (!workspaceId) {
      return res
        .status(401)
        .json({ ok: false, error: "Workspace not found on user" });
    }

    if (!epicId) {
      return res
        .status(400)
        .json({ ok: false, error: "epicId is required in path" });
    }

    const epic = await Epic.findOne({ _id: epicId, workspaceId }).lean();

    if (!epic) {
      return res
        .status(404)
        .json({ ok: false, error: "Epic not found in this workspace" });
    }

    const outcome = await EpicOutcome.findOne({
      workspaceId,
      epicId: epic._id,
    }).lean();

    const issues = await Issue.find({
      workspaceId,
      epicId: epic._id,
    }).lean();

    const now = new Date();
    const deadline = outcome?.deadline || epic.targetDelivery || null;
    const closedAt =
      outcome?.closedAt || epic.closedAt || epic.updatedAt || now;

    let slipDays =
      outcome?.slipDays ??
      (deadline && closedAt
        ? Math.ceil((closedAt - deadline) / MS_PER_DAY)
        : null);

    if (slipDays != null && slipDays < 0) slipDays = 0;

    let outcomeBand = outcome?.outcomeBand;
    if (!outcomeBand && slipDays != null) {
      outcomeBand = computeOutcomeBandFromSlipDays(slipDays);
    }

    const rootCauses = [];
    const events = [];

    for (const issue of issues) {
      const history = issue.statusHistory || [];
      const createdAt = issue.createdAtJira || issue.createdAt || null;
      const firstInProgress = firstStatusTime(history, "in_progress");
      const doneAt =
        lastStatusTime(history, "done") || issue.resolvedAt || null;
      const endTime = doneAt || closedAt || now;

      let ageDays = null;
      if (createdAt && endTime) {
        ageDays = (endTime - createdAt) / MS_PER_DAY;
      }

      let cycleTimeDays = null;
      if (firstInProgress && doneAt) {
        cycleTimeDays = (doneAt - firstInProgress) / MS_PER_DAY;
      }

      const isBug = issue.type === "Bug";
      const isCriticalBug =
        isBug &&
        (issue.priority === "Critical" || issue.priority === "Blocker");

      const flags = [];

      if (cycleTimeDays != null && cycleTimeDays >= 7) {
        flags.push("long_running_cycle");
      }
      if (!doneAt && ageDays != null && ageDays >= 7) {
        flags.push("still_open_long_running");
      }
      if (isCriticalBug) {
        flags.push("critical_bug");
      }

      if (flags.length) {
        rootCauses.push({
          issueId: issue._id,
          key: issue.key,
          type: issue.type,
          priority: issue.priority || null,
          assignee:
            issue.assignee?.displayName || issue.assignee?.email || null,
          ageDays: ageDays != null ? Math.round(ageDays) : null,
          cycleTimeDays:
            cycleTimeDays != null ? Math.round(cycleTimeDays) : null,
          flags,
          createdAt,
          firstInProgress,
          doneAt,
        });
      }

      // Add major events for the timeline (only for flagged ones)
      if (flags.length) {
        if (firstInProgress) {
          events.push({
            date: firstInProgress,
            kind: "issue_started",
            key: issue.key,
            label: `Work started on ${issue.key}`,
          });
        }
        if (doneAt) {
          events.push({
            date: doneAt,
            kind: "issue_completed",
            key: issue.key,
            label: `Completed ${issue.key}`,
          });
        } else if (createdAt) {
          events.push({
            date: createdAt,
            kind: "issue_open",
            key: issue.key,
            label: `Opened ${issue.key} (still not done)`,
          });
        }
      }
    }

    // Sort root causes: critical bugs first, then longest cycles
    const topRootCauses = rootCauses
      .sort((a, b) => {
        const aCrit = a.flags.includes("critical_bug") ? 1 : 0;
        const bCrit = b.flags.includes("critical_bug") ? 1 : 0;
        if (bCrit !== aCrit) return bCrit - aCrit;

        const aCycle = a.cycleTimeDays || 0;
        const bCycle = b.cycleTimeDays || 0;
        return bCycle - aCycle;
      })
      .slice(0, 5);

    // Build high-level epic events
    const timeline = [];

    if (epic.createdAtJira || epic.createdAt) {
      timeline.push({
        date: epic.createdAtJira || epic.createdAt,
        kind: "epic_created",
        label: `Epic ${epic.key} created`,
      });
    }

    if (epic.startedAt) {
      timeline.push({
        date: epic.startedAt,
        kind: "epic_started",
        label: `Epic ${epic.key} started`,
      });
    }

    if (deadline) {
      timeline.push({
        date: deadline,
        kind: "deadline",
        label: "Target delivery date",
      });
    }

    if (closedAt) {
      timeline.push({
        date: closedAt,
        kind: "epic_closed",
        label: "Epic closed",
      });
    }

    // Add flagged issue events
    timeline.push(...events);

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.json({
      ok: true,
      data: {
        epic: {
          id: epic._id,
          key: epic.key,
          title: epic.title,
          outcomeBand,
          slipDays,
          deadline,
          closedAt,
        },
        rootCauses: topRootCauses,
        timeline,
      },
    });
  } catch (err) {
    logError("getEpicSlipChain error", {
      error: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

export const simulateEpicScenario = async (req, res) => {
  try {
    const workspaceId = req.user?.workspaceId;
    const { epicId } = req.params;
    const { targetShiftDays = 0 } = req.body || {};

    if (!workspaceId) {
      return res
        .status(401)
        .json({ ok: false, error: "Workspace not found on user" });
    }

    if (!epicId) {
      return res
        .status(400)
        .json({ ok: false, error: "epicId is required in path" });
    }

    const epic = await Epic.findOne({ _id: epicId, workspaceId }).lean();
    if (!epic) {
      return res
        .status(404)
        .json({ ok: false, error: "Epic not found in this workspace" });
    }

    const issues = await Issue.find({
      workspaceId,
      epicId: epic._id,
    }).lean();

    const today = startOfDay(new Date());
    const ninetyDaysAgo = subDays(today, 90);

    const dailySignal = await DailyEpicSignal.findOne({
      workspaceId,
      epicId: epic._id,
      date: today,
    }).lean();

    const weeklyCheckins = await EpicWeeklyCheckin.find({
      workspaceId,
      epicId: epic._id,
      weekStart: { $gte: ninetyDaysAgo },
    })
      .sort({ weekStart: -1 }) // newest first
      .lean();

    // BASELINE – current epic as-is
    const baselineEval = evaluateEpicSignals({
      epic,
      issues,
      dailySignal,
      ownerMetrics: null,
      weeklyCheckins,
      now: new Date(),
    });

    // SCENARIO – shift target date if requested
    const scenarioEpic = { ...epic };

    if (
      typeof targetShiftDays === "number" &&
      scenarioEpic.targetDelivery instanceof Date
    ) {
      scenarioEpic.targetDelivery = new Date(
        scenarioEpic.targetDelivery.getTime() + targetShiftDays * MS_PER_DAY
      );
    }

    const scenarioEval = evaluateEpicSignals({
      epic: scenarioEpic,
      issues,
      dailySignal,
      ownerMetrics: null,
      weeklyCheckins,
      now: new Date(),
    });

    return res.json({
      ok: true,
      data: {
        input: {
          targetShiftDays,
        },
        baseline: {
          riskLevel: baselineEval.riskLevel,
          probability: baselineEval.probability,
          confidence: baselineEval.confidence ?? null,
          forecastWindow: baselineEval.forecastWindow,
          genome: baselineEval.genome || null,
        },
        scenario: {
          riskLevel: scenarioEval.riskLevel,
          probability: scenarioEval.probability,
          confidence: scenarioEval.confidence ?? null,
          forecastWindow: scenarioEval.forecastWindow,
          genome: scenarioEval.genome || null,
        },
      },
    });
  } catch (err) {
    logError("simulateEpicScenario error", {
      error: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};
