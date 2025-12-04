// src/services/statsService.js
import Workspace from "../models/Workspace.js";
import Epic from "../models/Epic.js";
import Issue from "../models/Issue.js";
import DailyEpicSignal from "../models/DailyEpicSignal.js";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import Job from "../models/Job.js";

export async function getSystemStats() {
  const [
    workspaceCount,
    epicCount,
    issueCount,
    dailySignalCount,
    snapshotCount,
    pendingJobs,
    failedJobs,
  ] = await Promise.all([
    Workspace.countDocuments({}),
    Epic.countDocuments({}),
    Issue.countDocuments({}),
    DailyEpicSignal.countDocuments({}),
    PredictionSnapshot.countDocuments({}),
    Job.countDocuments({ status: "pending" }),
    Job.countDocuments({ status: "failed" }),
  ]);

  // latest snapshot per workspace would be ideal, but for now global lastRun
  const lastSnapshot = await PredictionSnapshot.findOne({})
    .sort({ createdAt: -1 })
    .lean();

  const lastDailySignal = await DailyEpicSignal.findOne({})
    .sort({ date: -1 })
    .lean();

  return {
    workspaces: workspaceCount,
    epics: epicCount,
    issues: issueCount,
    dailySignals: dailySignalCount,
    predictionSnapshots: snapshotCount,
    jobs: {
      pending: pendingJobs,
      failed: failedJobs,
    },
    lastPredictionSnapshotAt: lastSnapshot?.createdAt || null,
    lastDailySignalDate: lastDailySignal?.date || null,
  };
}
