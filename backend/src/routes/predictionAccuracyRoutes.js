// src/routes/predictionAccuracyRoutes.js
import express from "express";
import { getPredictionAccuracyForWorkspace } from "../services/predictionAccuracyService.js";
import { backfillEpicOutcomesForWorkspace } from "../services/epicOutcomeService.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET /api/predictions/accuracy
 * Returns how often Hamza was right about delays for the current workspace.
 */
// src/routes/predictionRoutes.js (or wherever this is)
router.get("/accuracy", auth, async (req, res) => {
  try {
    const workspaceId = req.user?.workspaceId;

    if (!workspaceId) {
      return res
        .status(401)
        .json({ ok: false, error: "Missing workspace in auth context" });
    }

    // Step 1: ensure EpicOutcome is up-to-date for this workspace
    await backfillEpicOutcomesForWorkspace(workspaceId);

    // Step 2: compute accuracy from PredictionSnapshot + EpicOutcome
    const stats = await getPredictionAccuracyForWorkspace(workspaceId);

    // IMPORTANT: do not cache this response
    res.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    // safety: if any middleware added it
    res.removeHeader("ETag");

    return res.status(200).json({
      ok: true,
      data: {
        workspaceId: stats.workspaceId,
        labelledEpics: stats.labelledEpics,

        tp: stats.tp,
        fp: stats.fp,
        tn: stats.tn,
        fn: stats.fn,

        accuracy: stats.accuracy,
        precision: stats.precision,
        recall: stats.recall,

        examples: stats.examples,
      },
    });
  } catch (err) {
    console.error("Error computing prediction accuracy:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to compute prediction accuracy",
    });
  }
});

export default router;
