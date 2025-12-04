// src/routes/predictionRoutes.js
import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import { logError } from "../utils/logger.js";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import { subDays } from "date-fns";
import {
  getEpicSignalsForEpic,
  getAssigneePerformanceForEpic,
  getEpicHealthForEpic,
} from "../services/epicRiskService.js";
import { isValidObjectId } from "../utils/validation.js";

const router = Router();

router.use(auth);

// ---- helpers --------------------------------------------------------

function requireWorkspaceFromUser(req, res) {
  const workspaceId =
    req.user?.workspaceId || req.user?.workspace?.id || req.user?.workspace;

  if (!workspaceId) {
    res.status(400).json({ error: "Workspace not found in token" });
    return null;
  }
  return workspaceId;
}

function assertWorkspaceMatch(req, res, pathWorkspaceId) {
  const userWorkspaceId = req.user?.workspaceId;

  if (!userWorkspaceId) {
    res.status(400).json({ error: "Workspace not found in token" });
    return null;
  }

  if (pathWorkspaceId && String(pathWorkspaceId) !== String(userWorkspaceId)) {
    res.status(403).json({ error: "Forbidden: workspace mismatch" });
    return null;
  }

  return userWorkspaceId;
}

router.get("/trend/:epicId", async (req, res) => {
  try {
    const { epicId } = req.params;
    const days = Number(req.query.days) || 30;

    const workspaceId = requireWorkspaceFromUser(req, res);
    if (!workspaceId) return;

    const since = subDays(new Date(), days);

    const snapshots = await PredictionSnapshot.find({
      workspaceId,
      epicId,
      createdAt: { $gte: since },
    })
      .sort({ createdAt: 1 })
      .lean();

    const data = snapshots.map((s) => ({
      date: s.createdAt,
      riskScore: typeof s.probability === "number" ? s.probability : null,
      riskLevel: s.riskLevel || null,
      forecastWindow: s.forecastWindow || null,
      reasonsCount: Array.isArray(s.reasons) ? s.reasons.length : 0,
    }));

    return res.json({
      epicId,
      from: since,
      points: data,
    });
  } catch (err) {
    logError("Prediction trend ERROR", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: "Failed to load trend" });
  }
});

// GET /api/predictions/workspaces/:workspaceId/epics/:epicId/signals
router.get(
  "/workspaces/:workspaceId/epics/:epicId/signals",
  async (req, res) => {
    try {
      const { workspaceId: pathWorkspaceId, epicId } = req.params;
      const workspaceId = assertWorkspaceMatch(req, res, pathWorkspaceId);
      if (!workspaceId) return;

      if (!isValidObjectId(epicId)) {
        return res.status(400).json({ error: "Invalid epicId" });
      }

      const data = await getEpicSignalsForEpic(workspaceId, epicId);
      return res.json(data);
    } catch (err) {
      console.error("[predictionRoutes] Get epic signals ERROR", {
        error: err.message,
        stack: err.stack,
      });
      return res.status(500).json({ error: "Failed to load epic signals" });
    }
  }
);

// GET /api/predictions/workspaces/:workspaceId/epics/:epicId/health
router.get(
  "/workspaces/:workspaceId/epics/:epicId/health",
  async (req, res) => {
    try {
      const { workspaceId: pathWorkspaceId, epicId } = req.params;
      const workspaceId = assertWorkspaceMatch(req, res, pathWorkspaceId);
      if (!workspaceId) return;

      if (!isValidObjectId(epicId)) {
        return res.status(400).json({ error: "Invalid epicId" });
      }

      const data = await getEpicHealthForEpic(workspaceId, epicId);
      return res.json(data);
    } catch (err) {
      console.error("[predictionRoutes] Get epic health ERROR", {
        error: err.message,
        stack: err.stack,
      });
      return res.status(500).json({ error: "Failed to load epic health" });
    }
  }
);

// GET /api/predictions/workspaces/:workspaceId/epics/:epicId/assignees
router.get(
  "/workspaces/:workspaceId/epics/:epicId/assignees",
  async (req, res) => {
    try {
      const { workspaceId: pathWorkspaceId, epicId } = req.params;
      const workspaceId = assertWorkspaceMatch(req, res, pathWorkspaceId);
      if (!workspaceId) return;

      if (!isValidObjectId(epicId)) {
        return res.status(400).json({ error: "Invalid epicId" });
      }

      const data = await getAssigneePerformanceForEpic(workspaceId, epicId);
      return res.json(data);
    } catch (err) {
      console.error("[predictionRoutes] assignees ERROR", {
        error: err.message,
        stack: err.stack,
      });
      return res
        .status(500)
        .json({ error: "Failed to load assignee performance" });
    }
  }
);

// GET /api/predictions/epic/:epicId/signals
router.get("/epic/:epicId/signals", async (req, res) => {
  try {
    const { epicId } = req.params;
    const queryWorkspaceId = req.query.workspaceId;

    const workspaceId = requireWorkspaceFromUser(req, res);
    if (!workspaceId) return;

    if (queryWorkspaceId && String(queryWorkspaceId) !== String(workspaceId)) {
      return res.status(403).json({ error: "Forbidden: workspace mismatch" });
    }

    if (!isValidObjectId(epicId)) {
      return res.status(400).json({ error: "Invalid epicId" });
    }

    const data = await getEpicSignalsForEpic(workspaceId, epicId);
    return res.json(data);
  } catch (err) {
    console.error("[predictionRoutes] /epic/:epicId/signals ERROR", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: "Failed to load epic signals" });
  }
});

// GET /api/predictions/epic/:epicId/health
router.get("/epic/:epicId/health", async (req, res) => {
  try {
    const { epicId } = req.params;
    const queryWorkspaceId = req.query.workspaceId;

    const workspaceId = requireWorkspaceFromUser(req, res);
    if (!workspaceId) return;

    if (queryWorkspaceId && String(queryWorkspaceId) !== String(workspaceId)) {
      return res.status(403).json({ error: "Forbidden: workspace mismatch" });
    }

    if (!isValidObjectId(epicId)) {
      return res.status(400).json({ error: "Invalid epicId" });
    }

    const data = await getEpicHealthForEpic(workspaceId, epicId);
    return res.json(data);
  } catch (err) {
    console.error("[predictionRoutes] /epic/:epicId/health ERROR", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: "Failed to load epic health" });
  }
});

// GET /api/predictions/epic/:epicId/assignees
router.get("/epic/:epicId/assignees", async (req, res) => {
  try {
    const { epicId } = req.params;
    const queryWorkspaceId = req.query.workspaceId;

    const workspaceId = requireWorkspaceFromUser(req, res);
    if (!workspaceId) return;

    if (queryWorkspaceId && String(queryWorkspaceId) !== String(workspaceId)) {
      return res.status(403).json({ error: "Forbidden: workspace mismatch" });
    }

    if (!isValidObjectId(epicId)) {
      return res.status(400).json({ error: "Invalid epicId" });
    }

    const result = await getAssigneePerformanceForEpic(workspaceId, epicId);
    return res.json(result);
  } catch (err) {
    logError("Get assignee performance ERROR", {
      error: err.message,
      stack: err.stack,
    });
    return res
      .status(500)
      .json({ error: "Failed to fetch assignee performance" });
  }
});

export default router;
