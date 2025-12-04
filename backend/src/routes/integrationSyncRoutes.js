// src/routes/integrationSyncRoutes.js
import { Router } from "express";
import Integration from "../models/Integration.js";
import { syncJiraEpicsForWorkspace } from "../services/jiraService.js";
import { auth } from "../middleware/authMiddleware.js";
import { logInfo, logError } from "../utils/logger.js";
import { createPredictionRebuildJob } from "../services/jobService.js";
import { backfillEpicOutcomesForWorkspace } from "../services/epicOutcomeService.js";

const router = Router();
router.use(auth);

router.post("/:integrationId/sync", async (req, res) => {
  try {
    const { integrationId } = req.params;
    const userId = req.user?.id;
    const workspaceId = req.user?.workspaceId;

    if (!workspaceId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const integration = await Integration.findById(integrationId);

    if (!integration) {
      return res
        .status(404)
        .json({ ok: false, error: "Integration not found" });
    }

    if (String(integration.workspaceId) !== String(workspaceId)) {
      return res.status(403).json({
        ok: false,
        error: "Forbidden: integration not in your workspace",
      });
    }

    // 🔒 hard lock: if already running and started < 10 min ago, block
    if (
      integration.syncInProgress &&
      integration.lastSyncStartedAt &&
      Date.now() - integration.lastSyncStartedAt.getTime() < 1 * 60 * 1000
    ) {
      return res.status(409).json({
        ok: false,
        error: "Sync already in progress for this integration",
      });
    }

    // mark as running
    integration.syncInProgress = true;
    integration.lastSyncStartedAt = new Date();
    integration.lastSyncStatus = "running";
    integration.lastErrorMessage = null;
    await integration.save();

    logInfo("Integration sync START", {
      integrationId,
      workspaceId,
      type: integration.type,
      baseUrl: integration.baseUrl,
      meta: integration.meta,
      userId,
    });

    let ingestResult;

    if (integration.type === "jira") {
      // high-level Jira service: handles Workspace + Integration plumbing
      ingestResult = await syncJiraEpicsForWorkspace(workspaceId);

      // After Jira data is fresh, recompute outcomes + schedule prediction rebuild
      try {
        // This will upsert EpicOutcome for all epics in this workspace
        await backfillEpicOutcomesForWorkspace(workspaceId);

        // Queue prediction rebuild so snapshots and risk bands match new state
        await createPredictionRebuildJob(workspaceId, userId);
      } catch (rebuildErr) {
        logError("Post-sync prediction/outcome rebuild failed", {
          workspaceId,
          integrationId,
          error: rebuildErr.message,
        });
      }
    } else {
      logInfo("Sync not implemented for integration type", {
        integrationId,
        type: integration.type,
      });
      const now = new Date();
      // release lock before returning
      await Integration.updateOne(
        { _id: integrationId },
        {
          $set: {
            syncInProgress: false,
            lastSyncFinishedAt: new Date(),
            lastSyncStatus: "error",
            lastErrorMessage: "Sync not implemented for this integration type",
            healthStatus: "unhealthy",
            lastErrorAt: now,
            lastErrorCode: 0,
          },
        }
      );

      return res.status(400).json({
        ok: false,
        error: "Sync not yet implemented for this integration type",
      });
    }

    const now = new Date();

    await Integration.updateOne(
      { _id: integrationId },
      {
        $set: {
          lastSyncAt: now,
          lastSyncFinishedAt: now,
          lastSyncStatus: "success",
          lastErrorMessage: null,
          syncInProgress: false,

          // health fields
          healthStatus: "healthy",
          lastSuccessAt: now,
          consecutiveFailures: 0,
        },
      }
    );

    logInfo("Integration sync SUCCESS", {
      integrationId,
      workspaceId,
      type: integration.type,
      ingestResult,
    });

    return res.json({
      ok: true,
      source: integration.type,
      ingest: ingestResult,
    });
  } catch (err) {
    const { integrationId } = req.params;

    logError("Integration sync failed", {
      integrationId,
      error: err?.message,
      stack: err?.stack,
      status: err?.response?.status,
      code: err?.code,
    });

    const now = new Date();
    let healthStatus = "degraded";
    let lastErrorCode = "unknown";
    const statusCode = err?.response?.status;

    if (statusCode === 401 || statusCode === 403) {
      // Auth / permissions broken – needs user fix
      healthStatus = "broken";
      lastErrorCode = "auth_error";
    } else if (statusCode === 429) {
      healthStatus = "degraded";
      lastErrorCode = "rate_limited";
    } else if (statusCode >= 500 && statusCode <= 599) {
      healthStatus = "degraded";
      lastErrorCode = "upstream_error";
    } else if (statusCode) {
      lastErrorCode = String(statusCode);
    } else if (err.code) {
      lastErrorCode = err.code;
    }

    try {
      const integ = await Integration.findById(integrationId);
      if (integ) {
        const consecutiveFailures = (integ.consecutiveFailures || 0) + 1;

        integ.syncInProgress = false;
        integ.lastSyncFinishedAt = now;
        integ.lastSyncStatus = "failed";
        integ.lastErrorMessage = err.message || "Sync failed";

        integ.healthStatus = healthStatus;
        integ.lastErrorCode = lastErrorCode;
        integ.lastErrorAt = now;
        integ.consecutiveFailures = consecutiveFailures;

        await integ.save();
      }
    } catch (e) {
      logError("Failed updating integration sync status", {
        integrationId,
        error: e?.message,
      });
    }

    return res.status(500).json({
      ok: false,
      error: err.message || "Sync failed",
    });
  }
});

router.get("/:integrationId/health", async (req, res) => {
  try {
    const { integrationId } = req.params;
    const workspaceId = req.user?.workspaceId;

    const integration = await Integration.findById(integrationId).lean();

    if (!integration) {
      return res.status(404).json({
        ok: false,
        error: "Integration not found",
      });
    }

    if (String(integration.workspaceId) !== String(workspaceId)) {
      return res.status(403).json({
        ok: false,
        error: "Forbidden: integration not in your workspace",
      });
    }

    const {
      status,
      healthStatus,
      lastSyncStartedAt,
      lastSyncFinishedAt,
      lastSyncStatus,
      lastErrorMessage,
      lastErrorCode,
      lastErrorAt,
      lastSuccessAt,
      consecutiveFailures,
      type,
      baseUrl,
    } = integration;

    return res.json({
      ok: true,
      data: {
        type,
        baseUrl,
        status,
        healthStatus,
        lastSyncStartedAt,
        lastSyncFinishedAt,
        lastSyncStatus,
        lastErrorMessage,
        lastErrorCode,
        lastErrorAt,
        lastSuccessAt,
        consecutiveFailures,
      },
    });
  } catch (err) {
    logError("Failed reading integration health", {
      integrationId: req.params.integrationId,
      error: err?.message,
    });

    return res.status(500).json({
      ok: false,
      error: "Failed to load integration health",
    });
  }
});
export default router;
