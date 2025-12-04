import { Router } from "express";

import { auth } from "../middleware/authMiddleware.js";
import {
  getAssigneeReliability,
  getMyWorkspace,
  getMyWorkspaceStatus,
  updatePredictionWindow,
  updateWorkspaceSettings, // ✅ add this
} from "../controllers/WorkspaceController.js";

const router = Router();
router.use(auth);

// Basic workspace info
router.get("/me", getMyWorkspace);

// Delivery / data health status for this workspace
router.get("/me/status", getMyWorkspaceStatus);

// Update prediction horizon + working days + timezone etc.
router.patch("/me", updateWorkspaceSettings); // ✅ the one your hook is calling

router.put("/:id/prediction-window", updatePredictionWindow);
// Assignee Reliability Index for this workspace
router.get("/:id/assignees/reliability", getAssigneeReliability);

export default router;
