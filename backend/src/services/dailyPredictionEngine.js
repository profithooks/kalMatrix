// src/services/dailyPredictionEngine.js
import Epic from "../models/Epic.js";
import DailyEpicSignal from "../models/DailyEpicSignal.js";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import EpicWeeklyCheckin from "../models/EpicWeeklyCheckin.js";
import Issue from "../models/Issue.js";
import { startOfDay, subDays } from "date-fns";
import { evaluateEpicSignals } from "../prediction/evaluateEpicSignals.js";
import { logInfo } from "../utils/logger.js";

/**
 * Generate daily prediction snapshots for all epics in a workspace.
 *
 * This version avoids N+1 queries by:
 *  - Loading all epics for the workspace in one query
 *  - Loading all issues for those epics in one query
 *  - Loading today's daily signals for those epics in one query
 *  - Loading recent weekly check-ins in one query
 * and then grouping in memory.
 */
export async function generateDailyPredictions(
  workspaceId,
  { windowWeeks = 6 } = {}
) {
  const today = startOfDay(new Date());
  const ninetyDaysAgo = subDays(today, 90);

  // 1) Load all epics for this workspace
  const epics = await Epic.find({ workspaceId }).lean();
  if (!epics.length) {
    return { totalEpics: 0, updatedSnapshots: 0 };
  }

  const epicIds = epics.map((e) => e._id);
  const epicIdStrings = epicIds.map((id) => String(id));

  // 2) Load all issues for these epics in one go
  const issues = await Issue.find({
    workspaceId,
    epicId: { $in: epicIds },
  }).lean();

  const issuesByEpic = new Map();
  for (const issue of issues) {
    const key = String(issue.epicId);
    if (!issuesByEpic.has(key)) issuesByEpic.set(key, []);
    issuesByEpic.get(key).push(issue);
  }

  // 3) Load today's daily signals for these epics in one go
  const dailySignals = await DailyEpicSignal.find({
    workspaceId,
    epicId: { $in: epicIds },
    date: today,
  }).lean();

  const dailyByEpic = new Map();
  for (const row of dailySignals) {
    dailyByEpic.set(String(row.epicId), row);
  }

  // 4) Load weekly check-ins (last 90 days) in one go
  // 4) Load weekly check-ins (last 90 days) in one go
  const weeklyCheckins = await EpicWeeklyCheckin.find({
    workspaceId,
    epicId: { $in: epicIds },
    weekStart: { $gte: ninetyDaysAgo },
  })
    .sort({ weekStart: -1 }) // IMPORTANT: newest first
    .lean();

  logInfo("dailyPredictionEngine:weekly_checkins_loaded", {
    workspaceId: String(workspaceId),
    totalCheckins: weeklyCheckins.length,
    epicsWithCheckins: new Set(weeklyCheckins.map((w) => String(w.epicId)))
      .size,
    sample: weeklyCheckins.slice(0, 5).map((w) => ({
      epicId: String(w.epicId),
      weekStart: w.weekStart,
      status: w.status || w.leadAnswer,
    })),
  });

  const weeklyByEpic = new Map();
  for (const w of weeklyCheckins) {
    const key = String(w.epicId);
    if (!weeklyByEpic.has(key)) weeklyByEpic.set(key, []);
    weeklyByEpic.get(key).push(w);
  }

  // 5) Evaluate and persist snapshots
  let updatedSnapshots = 0;

  for (const epic of epics) {
    const epicIdStr = String(epic._id);

    const epicIssues = issuesByEpic.get(epicIdStr) || [];
    const dailySignal = dailyByEpic.get(epicIdStr) || null;
    const epicWeeklyCheckins = weeklyByEpic.get(epicIdStr) || [];

    const evaluation =
      evaluateEpicSignals({
        epic,
        issues: epicIssues,
        dailySignal,
        ownerMetrics: null, // reserved for assignee performance later
        weeklyCheckins: epicWeeklyCheckins,
        now: today,
      }) || {};

    const {
      probability,
      riskLevel,
      reasons,
      forecastWindow,
      signals,
      ...rest
    } = evaluation;

    // If engine didn't compute a numeric probability, skip snapshot
    if (typeof probability !== "number") continue;

    await PredictionSnapshot.create({
      workspaceId,
      epicId: epic._id,
      probability,
      riskLevel,
      reasons,
      forecastWindow,
      signals,
      // keep any extra fields evaluateEpicSignals decides to add
      ...rest,
    });

    updatedSnapshots++;
  }
  logInfo("dailyPredictionEngine:workspace_done", {
    workspaceId: String(workspaceId),
    totalEpics: epics.length,
    updatedSnapshots,
  });

  return { totalEpics: epics.length, updatedSnapshots };
}
