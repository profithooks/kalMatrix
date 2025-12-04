// src/routes/epicOutcomeRoutes.js
import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  recomputeOutcomeForEpic,
  getOutcomeForEpic,
  getSlipChainForEpic,
} from "../services/epicOutcomeService.js";

const router = Router();

// All outcome routes require auth
router.use(auth);

/**
 * Ensure the workspaceId in the URL matches the authenticated user's workspace.
 * This keeps the URL RESTful but prevents cross-workspace access.
 */
function assertWorkspaceMatch(req, res) {
  const { workspaceId: pathWorkspaceId } = req.params;
  const userWorkspaceId = req.user?.workspaceId?.toString();

  if (!userWorkspaceId) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return false;
  }

  if (pathWorkspaceId && pathWorkspaceId !== userWorkspaceId) {
    res.status(403).json({
      ok: false,
      error: "Forbidden: workspace mismatch",
    });
    return false;
  }

  return true;
}

/**
 * POST /api/workspaces/:workspaceId/epics/:epicId/outcome/recompute
 *
 * Manually recompute outcome (useful after sync or for testing).
 */
router.post(
  "/workspaces/:workspaceId/epics/:epicId/outcome/recompute",
  async (req, res, next) => {
    try {
      if (!assertWorkspaceMatch(req, res)) return;

      const workspaceId = req.user.workspaceId;
      const { epicId } = req.params;

      const doc = await recomputeOutcomeForEpic(workspaceId, epicId);
      res.json({ ok: true, outcome: doc });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/epics/:epicId/outcome
 *
 * Fetch the stored outcome document (if any).
 */
router.get(
  "/workspaces/:workspaceId/epics/:epicId/outcome",
  async (req, res, next) => {
    try {
      if (!assertWorkspaceMatch(req, res)) return;

      const workspaceId = req.user.workspaceId;
      const { epicId } = req.params;

      const doc = await getOutcomeForEpic(workspaceId, epicId);
      res.json({ ok: true, outcome: doc });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
/**
 * GET /api/workspaces/:workspaceId/epics/:epicId/slip-chain
 */
router.get(
  "/workspaces/:workspaceId/epics/:epicId/slip-chain",
  async (req, res, next) => {
    try {
      if (!assertWorkspaceMatch(req, res)) return;

      const workspaceId = req.user.workspaceId;
      const { epicId } = req.params;

      const data = await getSlipChainForEpic(workspaceId, epicId);
      res.json({ ok: true, data });
    } catch (err) {
      if (err.code === "EPIC_NOT_FOUND") {
        return res
          .status(404)
          .json({ ok: false, error: "Epic not found in this workspace" });
      }
      next(err);
    }
  }
);
