// src/routes/jobRoutes.js
import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  createPredictionRebuildJob,
  getJobById,
} from "../services/jobService.js";
import { isValidObjectId } from "../utils/validation.js";

const router = Router();

// All job routes require auth
router.use(auth);

/**
 * POST /api/jobs/predictions/rebuild
 *
 * Enqueue a prediction rebuild job for the current user's workspace.
 * Response is immediate – worker will do the heavy work.
 */
router.post("/predictions/rebuild", async (req, res, next) => {
  try {
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;

    if (!workspaceId) {
      return res.status(400).json({ ok: false, error: "No workspace on user" });
    }

    const job = await createPredictionRebuildJob(workspaceId, userId);

    return res.status(202).json({
      ok: true,
      message: "Prediction rebuild job enqueued",
      jobId: job._id.toString(),
      workspaceId: workspaceId.toString(),
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/jobs/:jobId
 *
 * Fetch job status (for optional polling in UI).
 */
router.get("/:jobId", async (req, res, next) => {
  try {
    const { jobId } = req.params;

    if (!isValidObjectId(jobId)) {
      return res.status(400).json({ ok: false, error: "Invalid jobId" });
    }

    const job = await getJobById(jobId);

    if (!job) {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }

    // Optional: enforce tenant isolation – only allow same workspace
    const userWorkspaceId = req.user?.workspaceId?.toString();
    if (
      userWorkspaceId &&
      job.workspaceId &&
      userWorkspaceId !== job.workspaceId.toString()
    ) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    return res.json({
      ok: true,
      job: {
        id: job._id.toString(),
        type: job.type,
        status: job.status,
        workspaceId: job.workspaceId?.toString() || null,
        requestedBy: job.requestedBy?.toString() || null,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        durationMs: job.durationMs,
        error: job.error || null,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
