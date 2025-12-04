// src/controllers/epicRiskController.js
import { getEpicRiskForWorkspace } from "../services/epicRiskService.js";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import { logError } from "../utils/logger.js";

/**
 * GET /api/workspaces/:workspaceId/epics/risk
 *
 * Returns full epic risk dashboard + accuracy badge
 */
// Make sure at top of file you have:
// import { getEpicRiskForWorkspace } from "../services/epicRiskService.js";
// import PredictionSnapshot from "../models/PredictionSnapshot.js";

export async function getWorkspaceEpicRisk(req, res) {
  try {
    const authWorkspaceId = req.user?.workspaceId;
    const paramWorkspaceId = req.params.workspaceId; // from URL param

    if (!authWorkspaceId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    // Enforce workspace match
    if (
      paramWorkspaceId &&
      paramWorkspaceId.toString() !== authWorkspaceId.toString()
    ) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const workspaceId = authWorkspaceId;

    // Pagination params (page 1-based)
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit, 10) || 50;
    const limit = Math.min(Math.max(limitRaw, 1), 100); // cap at 100
    const skip = (page - 1) * limit;

    // 1. Get main risk data (service returns { summary, epics: [...] })
    const riskData = await getEpicRiskForWorkspace(workspaceId);
    const allEpics = Array.isArray(riskData.epics) ? riskData.epics : [];

    const total = allEpics.length;
    const pagedEpics = allEpics.slice(skip, skip + limit);

    // 2. Calculate Accuracy Badge – the magic number everyone trusts
    const accuracyStats = await PredictionSnapshot.aggregate([
      {
        $match: {
          workspaceId,
          probability: { $gte: 70 }, // we only count high-confidence warnings
        },
      },
      {
        $lookup: {
          from: "epicoutcomes",
          localField: "epicId",
          foreignField: "epicId",
          as: "outcome",
        },
      },
      { $unwind: { path: "$outcome", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          $or: [
            { "outcome.outcomeBand": { $in: ["slip_1_3", "slip_3_plus"] } },
            { outcome: { $exists: false } }, // still count if outcome not computed yet
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalHighRiskPredictions: { $sum: 1 },
          correctSlips: {
            $sum: {
              $cond: [
                { $in: ["$outcome.outcomeBand", ["slip_1_3", "slip_3_plus"]] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const stats = accuracyStats[0] || {
      totalHighRiskPredictions: 0,
      correctSlips: 0,
    };

    const accuracyPercent =
      stats.totalHighRiskPredictions > 0
        ? Math.round(
            (stats.correctSlips / stats.totalHighRiskPredictions) * 100
          )
        : 0;

    const accuracyBadge =
      stats.totalHighRiskPredictions === 0
        ? "No high-risk predictions yet"
        : `${accuracyPercent}% accurate on high-risk warnings`;

    // Set pagination headers (non-breaking)
    res.set("X-Total-Count", String(total));
    res.set("X-Page", String(page));
    res.set("X-Limit", String(limit));

    // 3. Final response (same shape, but epics paginated + meta added)
    return res.json({
      ok: true,
      ...riskData,
      epics: pagedEpics,
      meta: {
        accuracyBadge,
        totalHighRisk: stats.totalHighRiskPredictions,
        correctPredictions: stats.correctSlips,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    logError("getWorkspaceEpicRisk error:", {
      error: err.message,
      stack: err.stack,
    });
    return res
      .status(500)
      .json({ ok: false, error: err.message || "Server error" });
  }
}
