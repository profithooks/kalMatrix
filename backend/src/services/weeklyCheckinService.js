// src/services/weeklyCheckinService.js
import { startOfWeek, addDays } from "date-fns";
import WeeklyEpicStatus from "../models/WeeklyEpicStatus.js";
import DailyEpicSignal from "../models/DailyEpicSignal.js";
import Epic from "../models/Epic.js";

function getWeekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

async function buildWeeklySignalsSnapshot(workspaceId, epicId, weekStart) {
  const weekEnd = addDays(weekStart, 7);

  const signals = await DailyEpicSignal.find({
    workspaceId,
    epicId,
    date: { $gte: weekStart, $lt: weekEnd },
  }).sort({ date: 1 });

  if (!signals.length) {
    return {
      windowDays: 7,
      hasSignals: false,
    };
  }

  const days = signals.length;
  const sum = signals.reduce(
    (acc, s) => {
      acc.openIssues += s.openIssuesCount || 0;
      acc.doneIssues += s.doneIssuesCount || 0;
      acc.storyPointsTotal += s.storyPointsTotal || 0;
      acc.storyPointsCompleted += s.storyPointsCompleted || 0;
      return acc;
    },
    {
      openIssues: 0,
      doneIssues: 0,
      storyPointsTotal: 0,
      storyPointsCompleted: 0,
    }
  );

  const last = signals[signals.length - 1];

  return {
    windowDays: 7,
    hasSignals: true,
    daysWithData: days,
    avgOpenIssues: sum.openIssues / days,
    avgDoneIssues: sum.doneIssues / days,
    storyPointsTotalLast: sum.storyPointsTotal / days,
    storyPointsCompletedLast: sum.storyPointsCompleted / days,
    lastSignalDate: last.date,
  };
}

/**
 * Create or update weekly check-in for an epic.
 *
 * This will be called when the lead clicks:
 *  - on_track
 *  - slip_1_3
 *  - slip_3_plus
 */
export async function upsertWeeklyCheckin({
  workspaceId,
  epicId,
  leadAnswer,
  reason,
  date = new Date(),
}) {
  const epic = await Epic.findOne({ _id: epicId, workspaceId });
  if (!epic) {
    throw new Error("Epic not found for this workspace");
  }

  const weekStart = getWeekStart(date);
  const snapshot = await buildWeeklySignalsSnapshot(
    workspaceId,
    epicId,
    weekStart
  );

  const doc = await WeeklyEpicStatus.findOneAndUpdate(
    { workspaceId, epicId, weekStart },
    {
      $set: {
        leadAnswer,
        reason: reason || null,
        autoSignalsSnapshot: snapshot,
      },
    },
    { upsert: true, new: true }
  );

  return doc;
}

export async function getWeeklyCheckinsForEpic(workspaceId, epicId) {
  return WeeklyEpicStatus.find({ workspaceId, epicId }).sort({
    weekStart: -1,
  });
}
