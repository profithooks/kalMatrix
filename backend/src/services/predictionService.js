// src/services/predictionService.js
import Epic from "../models/Epic.js";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import { startOfDay } from "date-fns";

import { syncGithubReposForWorkspace } from "./githubService.js";
import { syncJiraEpicsForWorkspace } from "./jiraService.js";
import { syncAzureEpicsForWorkspace } from "./azureBoardsService.js";

// THESE TWO LINES ARE THE ONLY THING MISSING BEFORE
import { generateDailySignals } from "./dailySignalEngine.js"; // ADD THIS
import { generateDailyPredictions } from "./dailyPredictionEngine.js";
import Workspace from "../models/Workspace.js";

/**
 * Unified prediction pipeline
 * - Optionally syncs integrations
 * - Generates daily signals (THE MISSING PIECE)
 * - Runs prediction engine
 * - Returns stats
 */
export const rebuildPredictionsForWorkspace = async (
  workspaceId,
  { skipSync = false } = {}
) => {
  let github = null;
  let jira = null;
  let azure = null;

  if (!skipSync) {
    try {
      github = await syncGithubReposForWorkspace(workspaceId);
    } catch (err) {
      console.warn("[predictionService] GitHub sync failed", err.message);
    }

    try {
      jira = await syncJiraEpicsForWorkspace(workspaceId);
    } catch (err) {
      console.warn("[predictionService] Jira sync failed", err.message);
    }

    try {
      azure = await syncAzureEpicsForWorkspace(workspaceId);
    } catch (err) {
      console.warn("[predictionService] Azure Boards sync failed", err.message);
    }
  }

  // THIS IS THE FIX — TWO LINES ONLY

  await generateDailySignals(workspaceId); // THIS WAS MISSING
  const ws = await Workspace.findById(workspaceId).lean();
  const windowWeeks = ws?.predictionWindowWeeks || 6;

  await generateDailyPredictions(workspaceId, { windowWeeks });

  const today = startOfDay(new Date());

  const totalEpics = await Epic.countDocuments({ workspaceId });
  const updatedSnapshots = await PredictionSnapshot.countDocuments({
    workspaceId,
    createdAt: { $gte: today },
  });

  try {
    await Workspace.findByIdAndUpdate(
      workspaceId,
      { lastPredictionRebuildAt: new Date() },
      { new: false }
    );
  } catch (err) {
    console.warn(
      "[predictionService] Failed to update lastPredictionRebuildAt",
      err.message
    );
  }
  console.log("[predictionService] rebuild:done", {
    workspaceId: String(workspaceId),
    totalEpics,
    updatedSnapshots,
    statuses: {
      githubSynced: github !== null,
      jiraSynced: jira !== null,
      azureSynced: azure !== null,
    },
  });
  return {
    totalEpics,
    updatedSnapshots,
    statuses: {
      githubSynced: github !== null,
      jiraSynced: jira !== null,
      azureSynced: azure !== null,
    },
  };
};
