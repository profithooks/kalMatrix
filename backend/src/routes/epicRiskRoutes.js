// src/routes/epicRiskRoutes.js
import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import { getWorkspaceEpicRisk } from "../controllers/epicRiskController.js";
import { sendError } from "../utils/apiError.js";


const router = Router();

// All epic risk routes require authentication
router.use(auth);

// GET /api/workspaces/:workspaceId/epics/risk
router.get("/workspaces/:workspaceId/epics/risk", getWorkspaceEpicRisk);

export default router;
