// src/routes/integrationStatusRoutes.js
import express from "express";

import Integration from "../models/Integration.js";
import { auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// all routes behind auth
router.use(auth);

/**
 * GET /api/integrations
 * List all integrations for current workspace with status summary.
 */
router.get("/integrations", async (req, res) => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const integrations = await Integration.find({ workspaceId }).lean();

    const items = integrations.map((i) => ({
      id: String(i._id),
      type: i.type,
      name: i.name,
      provider: i.provider,
      baseUrl: i.baseUrl,
      status: i.status, // "connected" / "disconnected" etc.
      lastSyncStatus: i.lastSyncStatus || "idle",
      lastSyncAt: i.lastSyncAt || null,
      lastSyncStartedAt: i.lastSyncStartedAt || null,
      lastSyncFinishedAt: i.lastSyncFinishedAt || null,
      syncInProgress: !!i.syncInProgress,
      lastErrorMessage: i.lastErrorMessage || null,
    }));

    return res.json({ ok: true, integrations: items });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load integrations",
    });
  }
});

/**
 * GET /api/integrations/:id/status
 * Detailed status for a single integration (for a detailed drawer/modal).
 */
router.get("/integrations/:id/status", async (req, res) => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const integration = await Integration.findOne({
      _id: req.params.id,
      workspaceId,
    }).lean();

    if (!integration) {
      return res
        .status(404)
        .json({ ok: false, error: "Integration not found" });
    }

    return res.json({
      ok: true,
      integration: {
        id: String(integration._id),
        type: integration.type,
        name: integration.name,
        provider: integration.provider,
        baseUrl: integration.baseUrl,
        status: integration.status,
        scopes: integration.scopes || [],
        lastSyncStatus: integration.lastSyncStatus || "idle",
        lastSyncAt: integration.lastSyncAt || null,
        lastSyncStartedAt: integration.lastSyncStartedAt || null,
        lastSyncFinishedAt: integration.lastSyncFinishedAt || null,
        syncInProgress: !!integration.syncInProgress,
        lastErrorMessage: integration.lastErrorMessage || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to load integration status",
    });
  }
});

export default router;
