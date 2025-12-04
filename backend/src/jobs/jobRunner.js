// src/jobs/jobRunner.js
import { runNextQueuedJob } from "../services/jobService.js";
import { logInfo, logError } from "../utils/logger.js";

let intervalHandle = null;

export function startJobRunner() {
  if (intervalHandle) return; // already running

  const INTERVAL_MS = Number(process.env.JOB_RUNNER_INTERVAL_MS || 10_000);

  intervalHandle = setInterval(async () => {
    try {
      const job = await runNextQueuedJob();
      // Per-job logging happens inside jobService; no extra noise here.
      if (!job) {
        // no jobs in queue – totally fine, stay quiet
      }
    } catch (err) {
      logError("[jobRunner] error while running job", {
        error: err.message,
        stack: err.stack,
      });
    }
  }, INTERVAL_MS);

  logInfo("[jobRunner] started", { intervalMs: INTERVAL_MS });
}

export function stopJobRunner() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logInfo("[jobRunner] stopped");
  }
}
