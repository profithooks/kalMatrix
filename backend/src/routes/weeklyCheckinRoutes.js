// src/routes/weeklyCheckinRoutes.js
import { Router } from "express";
import {
  upsertWeeklyCheckin,
  getWeeklyCheckinsForEpic,
} from "../services/weeklyCheckinService.js";
import {
  getPendingWeeklyCheckins,
  getWeeklyAccountabilitySummary,
  getWeeklyCheckinHistory,
  submitWeeklyCheckin,
} from "../controllers/weeklyCheckinController.js";
import { auth } from "../middleware/authMiddleware.js";

const router = Router();

// All routes below require auth
router.use(auth);

/**
 * POST /api/workspaces/:workspaceId/epics/:epicId/checkins/weekly
 *
 * Legacy service-style endpoint (can be kept for now, but still scoped by auth).
 */
router.post(
  "/workspaces/:workspaceId/epics/:epicId/checkins/weekly",
  async (req, res) => {
    try {
      const workspaceId = req.user.workspaceId;
      const { epicId } = req.params;
      const { status, comment } = req.body;

      const checkin = await upsertWeeklyCheckin({
        workspaceId,
        epicId,
        status,
        comment,
      });

      return res.json({ ok: true, checkin });
    } catch (err) {
      console.error("upsertWeeklyCheckin error:", err);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/epics/:epicId/checkins/weekly
 */
router.get(
  "/workspaces/:workspaceId/epics/:epicId/checkins/weekly",
  async (req, res) => {
    try {
      const workspaceId = req.user.workspaceId;
      const { epicId } = req.params;
      const checkins = await getWeeklyCheckinsForEpic(workspaceId, epicId);
      return res.json({ ok: true, checkins });
    } catch (err) {
      console.error("getWeeklyCheckinsForEpic error:", err);
      return res.status(500).json({ ok: false, error: "Server error" });
    }
  }
);

// GET /api/workspaces/:workspaceId/weekly-checkins/pending
router.get(
  "/workspaces/:workspaceId/weekly-checkins/pending",
  getPendingWeeklyCheckins
);

// POST /api/workspaces/:workspaceId/weekly-checkins
router.post("/workspaces/:workspaceId/weekly-checkins", submitWeeklyCheckin);
// GET /api/workspaces/:workspaceId/weekly-checkins/history
router.get(
  "/workspaces/:workspaceId/weekly-checkins/history",
  auth,
  getWeeklyCheckinHistory
);
// GET /api/workspaces/:workspaceId/weekly-checkins/accountability
router.get(
  "/workspaces/:workspaceId/weekly-checkins/accountability",
  auth,
  getWeeklyAccountabilitySummary
);
export default router;
