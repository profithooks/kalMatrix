// src/controllers/weeklyCheckinController.js
import { startOfWeek } from "date-fns";
import Epic from "../models/Epic.js";
import EpicWeeklyCheckin from "../models/EpicWeeklyCheckin.js";
import { logInfo, logError } from "../utils/logger.js";
import { z } from "zod";
import { rebuildPredictionsForWorkspace } from "../services/predictionService.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import { subWeeks } from "date-fns";

function getCurrentWeekStart() {
  return startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
}
const weeklyCheckinSchema = z
  .object({
    epicId: z.string().min(1, "epicId is required"),
    status: z.string().min(1, "status is required"),
    comment: z.string().max(1000, "comment too long").optional().nullable(),
  })
  .strict();
// GET /api/workspaces/:workspaceId/weekly-checkins/pending
export async function getPendingWeeklyCheckins(req, res) {
  try {
    const workspaceId = req.user.workspaceId;
    const weekStart = getCurrentWeekStart();
    logInfo("Weekly check-ins: pending fetch", {
      workspaceId,
      weekStart,
    });
    // active epics only
    const epics = await Epic.find({
      workspaceId,
      state: { $nin: ["Done", "Closed", "Cancelled"] },
      $or: [{ isActive: { $exists: false } }, { isActive: { $ne: false } }],
    }).lean();

    const epicIds = epics.map((e) => e._id);

    const checkins = await EpicWeeklyCheckin.find({
      workspaceId,
      epicId: { $in: epicIds },
      weekStart,
    }).lean();

    const submittedSet = new Set(checkins.map((c) => c.epicId.toString()));

    const pending = epics
      .filter((e) => !submittedSet.has(e._id.toString()))
      .map((e) => ({
        epicId: e._id,
        epicTitle: e.title,
        team: e.team,
        state: e.state,
      }));
    logInfo("Weekly check-ins: pending fetched", {
      workspaceId,
      weekStart,
      count: pending.length,
    });
    return res.json({
      ok: true,
      pending,
      weekStart,
    });
  } catch (err) {
    logError("getPendingWeeklyCheckins error", {
      error: err?.message,
      stack: err?.stack,
      workspaceId: req.user?.workspaceId,
    });
    res.status(500).json({ ok: false, error: "Server error" });
  }
}

// POST /api/workspaces/:workspaceId/weekly-checkins
export async function submitWeeklyCheckin(req, res) {
  const { workspaceId } = req.params;
  const userId = req.user?.id;
  console.log("req.user?.id", req.user);
  logInfo("submitWeeklyCheckin:incoming", {
    workspaceId,
    userId,
    body: req.body,
  });

  try {
    const parseResult = weeklyCheckinSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten();
      logError("submitWeeklyCheckin:validation_error", { errors });
      return res
        .status(400)
        .json({ ok: false, error: "Invalid payload", details: errors });
    }

    const { epicId, status, comment } = parseResult.data;

    const epic = await Epic.findOne({ _id: epicId, workspaceId }).lean();
    if (!epic) {
      logError("submitWeeklyCheckin:no_epic", { workspaceId, epicId });
      return res
        .status(404)
        .json({ ok: false, error: "Epic not found in this workspace" });
    }

    const weekStart = getCurrentWeekStart();
    logInfo("submitWeeklyCheckin:week_resolved", {
      workspaceId,
      epicId,
      weekStart,
    });

    const doc = await EpicWeeklyCheckin.findOneAndUpdate(
      { workspaceId, epicId, weekStart },
      {
        $set: {
          workspaceId,
          epicId,
          weekStart,
          leadAnswer: status,
          status,
          comment: comment || "",
          answeredAt: new Date(),
          createdByUserId: userId || null,
        },
      },
      { upsert: true, new: true }
    );

    logInfo("submitWeeklyCheckin:upserted", {
      workspaceId,
      epicId,
      weekStart: doc.weekStart,
      status: doc.status || doc.leadAnswer,
      checkinId: String(doc._id),
    });

    // Trigger predictions rebuild WITHOUT external sync
    try {
      logInfo("submitWeeklyCheckin:trigger_rebuild", {
        workspaceId,
        skipSync: true,
      });
      const result = await rebuildPredictionsForWorkspace(workspaceId, {
        skipSync: true,
      });
      logInfo("submitWeeklyCheckin:rebuild_done", {
        workspaceId,
        result,
      });
    } catch (err) {
      logError("submitWeeklyCheckin:rebuild_error", {
        workspaceId,
        error: err?.message,
        stack: err?.stack,
      });
    }

    logInfo("Weekly check-in UPSERTED", {
      workspaceId,
      epicId,
      status,
    });

    return res.json({ ok: true, checkin: doc });
  } catch (err) {
    logError("submitWeeklyCheckin error", {
      error: err?.message,
      stack: err?.stack,
    });
    res.status(500).json({ ok: false, error: "Server error" });
  }
}
// imports:
// import EpicWeeklyCheckin from "../models/EpicWeeklyCheckin.js";
// import mongoose from "mongoose";

export async function getWeeklyCheckinHistory(req, res) {
  try {
    const { workspaceId } = req.params;
    const { epicId, limit = 50 } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ ok: false, error: "workspaceId required" });
    }

    const wsId = new mongoose.Types.ObjectId(workspaceId);

    const query = { workspaceId: wsId };

    if (epicId) {
      query.epicId = new mongoose.Types.ObjectId(epicId);
    }

    const docs = await EpicWeeklyCheckin.find(query)
      .sort({ weekStart: -1, createdAt: -1 })
      .limit(Number(limit))
      .populate({
        path: "epicId",
        select: "key title name projectKey team", // whatever fields your Epic has
      })
      .lean();

    return res.json({
      ok: true,
      items: docs.map((c) => {
        const epic = c.epicId || {};
        return {
          id: String(c._id),
          epicId: String(epic._id || c.epicId),
          epicKey: epic.key || epic.projectKey || null,
          epicTitle: epic.title || epic.name || null,
          weekStart: c.weekStart,
          status: c.status, // from schema
          comment: c.reason || null, // from schema
          createdAt: c.createdAt,
          createdBy: c.createdByUserId || null,
        };
      }),
    });
  } catch (err) {
    console.error("getWeeklyCheckinHistory error", err);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
export async function getWeeklyAccountabilitySummary(req, res) {
  try {
    const { workspaceId } = req.params;
    const { weeks = 8 } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ ok: false, error: "workspaceId required" });
    }

    const wsId = new mongoose.Types.ObjectId(workspaceId);
    const numWeeks = Math.min(
      Math.max(parseInt(weeks, 10) || 8, 1),
      26 // hard cap: half-year
    );

    const now = new Date();
    const currentWeekStart = getCurrentWeekStart();
    const oldestWeekStart = subWeeks(currentWeekStart, numWeeks - 1);

    logInfo("getWeeklyAccountabilitySummary:input", {
      workspaceId,
      numWeeks,
      currentWeekStart,
      oldestWeekStart,
    });

    // Pull all check-ins for this workspace in the requested window
    const checkins = await EpicWeeklyCheckin.find({
      workspaceId: wsId,
      weekStart: {
        $gte: oldestWeekStart,
        $lte: currentWeekStart,
      },
    }).lean();

    if (!checkins.length) {
      return res.json({
        ok: true,
        data: {
          range: {
            from: oldestWeekStart,
            to: currentWeekStart,
            weeks: numWeeks,
          },
          users: [],
        },
      });
    }

    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    // Aggregate per user
    const perUser = new Map();

    for (const c of checkins) {
      const userId = c.createdByUserId
        ? c.createdByUserId.toString()
        : "unknown";

      let entry = perUser.get(userId);
      if (!entry) {
        entry = {
          userId: userId === "unknown" ? null : userId,
          totalCheckins: 0,
          onTimeCheckins: 0,
          lateCheckins: 0,
          weeksSet: new Set(),
        };
        perUser.set(userId, entry);
      }

      const weekKey = c.weekStart.toISOString().slice(0, 10);
      entry.weeksSet.add(weekKey);

      const createdAt = c.createdAt || c.updatedAt || new Date();
      const dueAt = new Date(c.weekStart.getTime() + THREE_DAYS_MS);
      const isOnTime = createdAt <= dueAt;

      entry.totalCheckins += 1;
      if (isOnTime) {
        entry.onTimeCheckins += 1;
      } else {
        entry.lateCheckins += 1;
      }
    }

    // Load user profiles for IDs we know
    const userIds = [...perUser.values()]
      .map((u) => u.userId)
      .filter((id) => !!id);

    const users = await User.find(
      { _id: { $in: userIds } },
      { name: 1, email: 1 }
    ).lean();

    const userLookup = new Map(
      users.map((u) => [u._id.toString(), { name: u.name, email: u.email }])
    );

    const result = [...perUser.entries()]
      .map(([rawId, entry]) => {
        const weeksWithCheckins = entry.weeksSet.size || 0;
        const onTimeRate =
          entry.totalCheckins > 0
            ? entry.onTimeCheckins / entry.totalCheckins
            : 0;

        const profile = entry.userId && userLookup.get(entry.userId.toString());

        // Normalized fields expected by frontend
        const onTime = entry.onTimeCheckins;
        const late = entry.lateCheckins;
        const missed = Math.max(0, numWeeks - weeksWithCheckins);
        const currentStreak = weeksWithCheckins; // simple streak = consecutive weeks with checkins (P0)

        return {
          userId: entry.userId,
          name: profile?.name || (entry.userId ? "Unknown user" : "Unknown"),
          email: profile?.email || null,

          // original fields (keep for future / other callers)
          totalCheckins: entry.totalCheckins,
          onTimeCheckins: entry.onTimeCheckins,
          lateCheckins: entry.lateCheckins,
          weeksWithCheckins,
          onTimeRate,

          // fields used by WeeklyCheckinsPage "By person"
          onTime,
          late,
          missed,
          currentStreak,
        };
      })
      // Sort: most active + reliable first
      .sort((a, b) => {
        if (b.weeksWithCheckins !== a.weeksWithCheckins) {
          return b.weeksWithCheckins - a.weeksWithCheckins;
        }
        return b.onTimeRate - a.onTimeRate;
      });

    // Top-level summary for the 3 big numbers (On time / Late / Missed)
    const summary = result.reduce(
      (acc, u) => {
        acc.onTimeCount += u.onTime;
        acc.lateCount += u.late;
        acc.missedCount += u.missed;
        return acc;
      },
      { onTimeCount: 0, lateCount: 0, missedCount: 0 }
    );

    return res.json({
      ok: true,
      data: {
        range: {
          from: oldestWeekStart,
          to: currentWeekStart,
          weeks: numWeeks,
        },
        summary,
        users: result,
      },
    });
  } catch (err) {
    logError("getWeeklyAccountabilitySummary error", {
      error: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
