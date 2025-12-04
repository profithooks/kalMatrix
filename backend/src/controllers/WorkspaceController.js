import Workspace from "../models/Workspace.js";
import Integration from "../models/Integration.js";
import Epic from "../models/Epic.js";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import DailyEpicSignal from "../models/DailyEpicSignal.js";
import User from "../models/User.js";
import { getTeamPerformanceForWorkspace } from "../services/epicRiskService.js";
import EpicOutcome from "../models/EpicOutcome.js";

export async function updateWorkspaceSettings(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user || !user.workspaceId) {
      return res
        .status(404)
        .json({ ok: false, error: "Workspace not found for user" });
    }

    const workspace = await Workspace.findById(user.workspaceId);
    if (!workspace) {
      return res.status(404).json({ ok: false, error: "Workspace not found" });
    }

    const { name, timezone, workingDays, horizonMinWeeks, horizonMaxWeeks } =
      req.body || {};

    if (name != null) workspace.name = name;
    if (timezone != null) workspace.timezone = timezone;

    if (Array.isArray(workingDays)) {
      workspace.workingDays = workingDays;
    }

    if (
      typeof horizonMinWeeks === "number" &&
      typeof horizonMaxWeeks === "number"
    ) {
      workspace.predictionWindowWeeksMin = horizonMinWeeks;
      workspace.predictionWindowWeeksMax = horizonMaxWeeks;
    }

    await workspace.save();

    return res.json({
      ok: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        timezone: workspace.timezone,
        workingDays: workspace.workingDays,
        predictionWindowWeeksMin: workspace.predictionWindowWeeksMin,
        predictionWindowWeeksMax: workspace.predictionWindowWeeksMax,
      },
    });
  } catch (err) {
    next(err);
  }
}

export const getMyWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.user.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    const teams = await getTeamPerformanceForWorkspace(workspace);
    return res.json({
      id: workspace._id,
      name: workspace.name,
      timezone: workspace.timezone,
      workingDays: workspace.workingDays,
      horizon: workspace.horizon,
      lastPredictionRebuildAt: workspace.lastPredictionRebuildAt || null,
      teams,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
};
export const getMyWorkspaceStatus = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // Load integrations and basic metrics in parallel
    const [integrations, epicCount, predictionCount, signalCount] =
      await Promise.all([
        Integration.find(
          { workspaceId },
          {
            type: 1,
            lastSyncAt: 1,
            lastSyncStatus: 1,
            lastErrorMessage: 1,
            createdAt: 1,
          }
        ).lean(),
        Epic.countDocuments({ workspaceId }),
        PredictionSnapshot.countDocuments({ workspaceId }),
        DailyEpicSignal.countDocuments({ workspaceId }),
      ]);

    const integrationSummary = integrations.map((i) => ({
      id: i._id,
      type: i.type,
      lastSyncAt: i.lastSyncAt || null,
      lastSyncStatus: i.lastSyncStatus || null,
      lastErrorMessage: i.lastErrorMessage || null,
      createdAt: i.createdAt,
    }));

    return res.json({
      workspace: {
        id: workspace._id,
        name: workspace.name,
        timezone: workspace.timezone,
        workingDays: workspace.workingDays,
        horizon: workspace.horizon,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
      integrations: integrationSummary,
      metrics: {
        epics: epicCount,
        predictionSnapshots: predictionCount,
        dailySignalDocs: signalCount,
      },
    });
  } catch (err) {
    console.error("[WorkspaceController] getMyWorkspaceStatus ERROR", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: "Server error" });
  }
};
export async function updatePredictionWindow(req, res) {
  try {
    const { id } = req.params;
    const { predictionWindowWeeks } = req.body;

    if (
      !predictionWindowWeeks ||
      predictionWindowWeeks < 1 ||
      predictionWindowWeeks > 6
    ) {
      return res
        .status(400)
        .json({ ok: false, error: "Window must be 1–6 weeks" });
    }

    const ws = await Workspace.findByIdAndUpdate(
      id,
      { predictionWindowWeeks },
      { new: true }
    );

    if (!ws) {
      return res.status(404).json({ ok: false, error: "Workspace not found" });
    }

    return res.json({ ok: true, workspace: ws });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
export async function getAssigneeReliability(req, res) {
  try {
    const { id } = req.params; // workspace id from route
    const authWorkspaceId = req.user?.workspaceId?.toString();

    if (!id) {
      return res
        .status(400)
        .json({ ok: false, error: "Workspace id required" });
    }

    if (authWorkspaceId && authWorkspaceId !== id.toString()) {
      return res
        .status(403)
        .json({ ok: false, error: "Forbidden: not your workspace" });
    }

    const windowDays = Math.min(
      Math.max(parseInt(req.query.windowDays || "90", 10) || 90, 7),
      365
    );

    const now = new Date();
    const since = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

    // Make sure workspace exists
    const workspace = await Workspace.findById(id).lean();
    if (!workspace) {
      return res.status(404).json({ ok: false, error: "Workspace not found" });
    }

    // 1) Load outcomes in this window
    const outcomes = await EpicOutcome.find(
      {
        workspaceId: id,
        closedAt: { $gte: since, $lte: now },
      },
      {
        epicId: 1,
        outcomeBand: 1,
        slipDays: 1,
      }
    ).lean();

    if (!outcomes.length) {
      return res.json({
        ok: true,
        data: {
          windowDays,
          from: since,
          to: now,
          assignees: [],
        },
      });
    }

    // 2) Load epics for these outcomes to get assignee info
    const epicIds = [...new Set(outcomes.map((o) => o.epicId.toString()))];

    const epics = await Epic.find(
      { _id: { $in: epicIds } },
      { assignees: 1 }
    ).lean();

    const epicById = new Map(epics.map((e) => [e._id.toString(), e]));

    // 3) Aggregate per assignee (using Jira accountId as key, fallback email/name)
    const perAssignee = new Map();

    for (const outcome of outcomes) {
      const epic = epicById.get(outcome.epicId.toString());
      if (!epic || !Array.isArray(epic.assignees) || !epic.assignees.length) {
        continue;
      }

      const main = epic.assignees[0] || {};
      const accountId = main.accountId || null;
      const email = main.email || null;
      const displayName = main.displayName || email || accountId || "Unknown";

      // Build a stable key for the assignee
      const key = accountId || email || displayName;
      if (!key) continue;

      let entry = perAssignee.get(key);
      if (!entry) {
        entry = {
          key,
          accountId: accountId || null,
          displayName,
          email: email || null,
          epicsTotal: 0,
          epicsOnTime: 0,
          epicsSlip1_3: 0,
          epicsSlip3Plus: 0,
          slipDaysTotal: 0,
        };
        perAssignee.set(key, entry);
      }

      entry.epicsTotal += 1;
      entry.slipDaysTotal += outcome.slipDays || 0;

      if (outcome.outcomeBand === "on_time") {
        entry.epicsOnTime += 1;
      } else if (outcome.outcomeBand === "slip_1_3") {
        entry.epicsSlip1_3 += 1;
      } else if (outcome.outcomeBand === "slip_3_plus") {
        entry.epicsSlip3Plus += 1;
      }
    }

    // 4) Finalize metrics
    const assignees = [...perAssignee.values()]
      .map((a) => {
        const avgSlipDays =
          a.epicsTotal > 0 ? a.slipDaysTotal / a.epicsTotal : 0;
        const onTimeRate = a.epicsTotal > 0 ? a.epicsOnTime / a.epicsTotal : 0;

        return {
          key: a.key,
          accountId: a.accountId,
          displayName: a.displayName,
          email: a.email,
          epicsTotal: a.epicsTotal,
          epicsOnTime: a.epicsOnTime,
          epicsSlip1_3: a.epicsSlip1_3,
          epicsSlip3Plus: a.epicsSlip3Plus,
          avgSlipDays,
          onTimeRate,
        };
      })
      // Sort: more epics first, then better on-time rate, then lower avg slip
      .sort((a, b) => {
        if (b.epicsTotal !== a.epicsTotal) {
          return b.epicsTotal - a.epicsTotal;
        }
        if (b.onTimeRate !== a.onTimeRate) {
          return b.onTimeRate - a.onTimeRate;
        }
        return a.avgSlipDays - b.avgSlipDays;
      });

    return res.json({
      ok: true,
      data: {
        windowDays,
        from: since,
        to: now,
        assignees,
      },
    });
  } catch (err) {
    console.error("[WorkspaceController] getAssigneeReliability ERROR", {
      error: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
