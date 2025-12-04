// src/services/jobService.js
import Job from "../models/Job.js";
import { rebuildPredictionsForWorkspace } from "./predictionService.js";
import { logInfo, logError } from "../utils/logger.js";

const STALE_JOB_MINUTES = 15;

export async function createPredictionRebuildJob(workspaceId, userId) {
  const job = await Job.create({
    type: "prediction_rebuild",
    workspaceId,
    requestedBy: userId || null,
    status: "queued",
  });

  logInfo("[jobService] created prediction_rebuild job", {
    jobId: job._id.toString(),
    workspaceId: workspaceId.toString(),
  });

  return job;
}

export async function getJobById(jobId) {
  return Job.findById(jobId);
}

export async function runNextQueuedJob() {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_JOB_MINUTES * 60 * 1000);

  // Atomically grab ONE job:
  // - status = queued, OR
  // - status = running but stale (updatedAt < staleCutoff)
  const job = await Job.findOneAndUpdate(
    {
      $or: [
        { status: "queued" },
        { status: "running", updatedAt: { $lt: staleCutoff } },
      ],
    },
    {
      $set: {
        status: "running",
        startedAt: now,
      },
    },
    {
      sort: { createdAt: 1 },
      new: true,
    }
  );

  if (!job) {
    return null; // nothing to do
  }

  const jobId = job._id.toString();
  const workspaceId = job.workspaceId.toString();

  logInfo("[jobService] picked job", {
    jobId,
    type: job.type,
    workspaceId,
  });

  const startHr = process.hrtime.bigint();

  try {
    switch (job.type) {
      case "prediction_rebuild": {
        await rebuildPredictionsForWorkspace(workspaceId);
        break;
      }

      default: {
        logError("[jobService] unknown job type", {
          jobId,
          type: job.type,
        });
        throw new Error(`Unknown job type: ${job.type}`);
      }
    }

    const endHr = process.hrtime.bigint();
    const durationMs = Number(endHr - startHr) / 1_000_000;

    job.status = "completed";
    job.finishedAt = new Date();
    job.durationMs = Math.round(durationMs);
    job.error = undefined;
    await job.save();

    logInfo("[jobService] job completed", {
      jobId,
      type: job.type,
      workspaceId,
      durationMs: job.durationMs,
    });

    return job;
  } catch (err) {
    const endHr = process.hrtime.bigint();
    const durationMs = Number(endHr - startHr) / 1_000_000;

    job.status = "failed";
    job.finishedAt = new Date();
    job.durationMs = Math.round(durationMs);
    job.error = {
      message: err.message,
      stack: err.stack,
    };
    await job.save();

    logError("[jobService] job failed", {
      jobId,
      type: job.type,
      workspaceId,
      error: err.message,
      durationMs: job.durationMs,
    });

    return job;
  }
}
