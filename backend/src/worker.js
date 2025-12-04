// src/worker.js
import "./config/env.js";

import { connectDB } from "./config/db.js";
import { startJobRunner } from "./jobs/jobRunner.js";
import cron from "node-cron";
import Workspace from "./models/Workspace.js";
import { rebuildPredictionsForWorkspace } from "./services/predictionService.js";
import { logInfo, logError } from "./utils/logger.js";


async function runDailyPredictionsForAllWorkspaces(reason) {
  logInfo(`[worker] Running daily predictions for all workspaces (${reason})`);

  const workspaces = await Workspace.find({});
  for (const ws of workspaces) {
    try {
      await rebuildPredictionsForWorkspace(ws._id, { skipSync: true });
      logInfo(`[worker] Predictions updated`, { workspaceId: String(ws._id) });
    } catch (err) {
      logError("[worker] Failed to update predictions for workspace", {
        workspaceId: String(ws._id),
        error: err.message,
        stack: err.stack,
      });
    }
  }
}

async function main() {
  await connectDB();

  // Start polling job queue
  startJobRunner();

  // DEV: run predictions once on startup so you see data instantly
  if (process.env.NODE_ENV !== "production") {
    runDailyPredictionsForAllWorkspaces("dev-startup").catch((err) =>
      logError("[worker] dev-startup failed", {
        error: err.message,
        stack: err.stack,
      })
    );
  }

  // PROD + DEV: cron at 3:30 AM every day
  cron.schedule("30 3 * * *", async () => {
    await runDailyPredictionsForAllWorkspaces("cron-3:30");
  });

  logInfo("[worker] started", { env: process.env.NODE_ENV });
}

main().catch((err) => {
  logError("[worker] fatal error", { error: err.message, stack: err.stack });
  process.exit(1);
});
