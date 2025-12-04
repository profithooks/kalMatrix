// src/services/epicOutcomeService.js
// src/services/epicOutcomeService.js
import mongoose from "mongoose";
import { differenceInCalendarDays } from "date-fns";
import Epic from "../models/Epic.js";
import EpicOutcome from "../models/EpicOutcome.js";
import Issue from "../models/Issue.js";

function isEpicCompleted(epic) {
  const statusCategory = epic.statusCategory || null;
  const isClosedByState =
    epic.state && ["Done", "Closed", "Cancelled"].includes(epic.state);
  const isClosedFlag = epic.isActive === false;
  const isClosedByHistory = Array.isArray(epic.statusHistory)
    ? epic.statusHistory.some((h) => h.category === "done" && !h.to)
    : false;

  return (
    statusCategory === "done" ||
    isClosedByState ||
    isClosedFlag ||
    isClosedByHistory
  );
}

function computeOutcomeForEpic(epic) {
  if (!isEpicCompleted(epic)) return null;

  const deadline =
    epic.targetDelivery || epic.deadline || epic.dueDate || epic.due || null;

  if (!deadline) {
    // No target date → cannot label outcome
    return null;
  }

  const closedAt =
    epic.closedAt ||
    epic.updatedAt ||
    epic.resolvedAt ||
    epic.completedAt ||
    new Date();

  const slipDays = differenceInCalendarDays(closedAt, deadline);

  let outcomeBand;
  if (slipDays <= 0) {
    outcomeBand = "on_time";
  } else if (slipDays <= 21) {
    outcomeBand = "slip_1_3";
  } else {
    outcomeBand = "slip_3_plus";
  }

  return {
    closedAt,
    deadline,
    slipDays,
    outcomeBand,
  };
}

export async function upsertEpicOutcomeForEpic(epic) {
  if (!epic) return null;

  const workspaceId = epic.workspaceId;
  if (!workspaceId) return null;

  const epicId = epic._id;
  const outcome = computeOutcomeForEpic(epic);
  if (!outcome) return null;

  const doc = await EpicOutcome.findOneAndUpdate(
    { epicId },
    {
      workspaceId,
      epicId,
      closedAt: outcome.closedAt,
      deadline: outcome.deadline,
      slipDays: outcome.slipDays,
      outcomeBand: outcome.outcomeBand,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return doc;
}

// src/services/epicOutcomeService.js

export async function backfillEpicOutcomesForWorkspace(workspaceId) {
  if (!workspaceId) return { workspaceId: null, updated: 0 };

  const totalEpics = await Epic.countDocuments({});
  const distinctWs = await Epic.distinct("workspaceId");
  console.log(
    "[OUTCOMES] DEBUG total epics in DB:",
    totalEpics,
    "distinct workspaceIds:",
    distinctWs.map((id) => String(id))
  );

  const epics = await Epic.find({ workspaceId }).lean();

  console.log(
    "[OUTCOMES] backfill workspace",
    String(workspaceId),
    "epics considered:",
    epics.length
  );

  let updated = 0;

  for (const epic of epics) {
    const outcome = computeOutcomeForEpic(epic);

    // ADD THIS DEBUG BLOCK
    const key = epic.key || epic.title || String(epic._id);
    if (!outcome) {
      console.log("[OUTCOMES] SKIP epic", key, {
        reason: "no_outcome",
        statusCategory: epic.statusCategory,
        isActive: epic.isActive,
        targetDelivery: epic.targetDelivery,
        deadline: epic.deadline,
        dueDate: epic.dueDate,
        due: epic.due,
      });
      continue;
    }

    console.log("[OUTCOMES] LABEL epic", key, {
      closedAt: outcome.closedAt,
      deadline: outcome.deadline,
      slipDays: outcome.slipDays,
      outcomeBand: outcome.outcomeBand,
    });
    // END DEBUG BLOCK

    await EpicOutcome.findOneAndUpdate(
      { epicId: epic._id },
      {
        workspaceId,
        epicId: epic._id,
        closedAt: outcome.closedAt,
        deadline: outcome.deadline,
        slipDays: outcome.slipDays,
        outcomeBand: outcome.outcomeBand,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    updated++;
  }

  console.log(
    "[OUTCOMES] backfill workspace",
    String(workspaceId),
    "upserted outcomes:",
    updated
  );

  return { workspaceId, updated };
}

export async function recomputeOutcomeForEpic(workspaceId, epicId) {
  const epic = await Epic.findOne({ _id: epicId, workspaceId }).lean();
  if (!epic) throw new Error("Epic not found");

  const outcome = computeOutcomeForEpic(epic);
  if (!outcome) return null;

  const doc = await EpicOutcome.findOneAndUpdate(
    { workspaceId, epicId },
    {
      workspaceId,
      epicId,
      closedAt: outcome.closedAt,
      deadline: outcome.deadline,
      slipDays: outcome.slipDays,
      outcomeBand: outcome.outcomeBand,
    },
    { upsert: true, new: true }
  ).lean();

  return doc;
}

export async function getOutcomeForEpic(workspaceId, epicId) {
  return EpicOutcome.findOne({ workspaceId, epicId }).lean();
}

export async function upsertEpicOutcomeById(workspaceId, epicId) {
  const epic = await Epic.findOne({ _id: epicId, workspaceId }).lean();
  if (!epic) return null;
  return upsertEpicOutcomeForEpic(epic);
}
function computeOutcomeBandFromSlipDays(slipDays) {
  if (slipDays == null) return null;
  if (slipDays <= 0) return "on_time";
  if (slipDays <= 21) return "slip_1_3";
  return "slip_3_plus";
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function firstStatusTime(history, category) {
  if (!Array.isArray(history)) return null;
  for (const h of history) {
    if (h.category === category && h.to) return h.to;
  }
  return null;
}

function lastStatusTime(history, category) {
  if (!Array.isArray(history)) return null;
  let latest = null;
  for (const h of history) {
    if (h.category === category && h.to) {
      if (!latest || h.to > latest) latest = h.to;
    }
  }
  return latest;
}

/**
 * Slip chain for one epic:
 * - outcome (deadline vs closedAt)
 * - ranked root-cause issues
 * - basic timeline
 */
export async function getSlipChainForEpic(workspaceId, epicId) {
  const epic = await Epic.findOne({ _id: epicId, workspaceId }).lean();
  if (!epic) {
    const err = new Error("Epic not found");
    err.code = "EPIC_NOT_FOUND";
    throw err;
  }

  const outcome = await EpicOutcome.findOne({ workspaceId, epicId }).lean();
  const issues = await Issue.find({ workspaceId, epicId }).lean();

  let deadline = outcome?.deadline || epic.targetDelivery || null;
  let closedAt =
    outcome?.closedAt ||
    epic.closedAt ||
    epic.updatedAt ||
    epic.resolvedAt ||
    epic.completedAt ||
    null;

  let slipDays = outcome?.slipDays ?? null;
  if (deadline && closedAt && slipDays == null) {
    slipDays = differenceInCalendarDays(closedAt, deadline);
  }

  const outcomeBand =
    outcome?.outcomeBand ?? computeOutcomeBandFromSlipDays(slipDays);

  const rootCauses = [];
  const endTime = closedAt || new Date();

  for (const issue of issues) {
    const history = issue.statusHistory || [];
    const createdAt = issue.createdAtJira || issue.createdAt || null;
    const firstInProgress = firstStatusTime(history, "in_progress");
    const doneAt = lastStatusTime(history, "done") || issue.resolvedAt || null;

    let ageDays = null;
    if (createdAt) {
      ageDays = Math.max(
        0,
        Math.round(
          (endTime.getTime() - new Date(createdAt).getTime()) / MS_PER_DAY
        )
      );
    }

    let cycleTimeDays = null;
    if (firstInProgress && doneAt) {
      cycleTimeDays = Math.max(
        0,
        Math.round(
          (new Date(doneAt).getTime() - new Date(firstInProgress).getTime()) /
            MS_PER_DAY
        )
      );
    }

    const flags = [];
    const type = issue.type || issue.issuetype || null;
    const priority = issue.priority || issue.priorityName || null;

    const isBug = type === "Bug" || type === "bug";
    const isCritical =
      priority === "Critical" ||
      priority === "Blocker" ||
      priority === "P0" ||
      priority === "P1";

    if (isBug && isCritical) flags.push("critical_bug");
    else if (isBug) flags.push("bug");

    if (ageDays != null && ageDays >= 21) flags.push("long_running");
    if (cycleTimeDays != null && cycleTimeDays >= 14) flags.push("slow_cycle");

    if (!flags.length) continue;

    rootCauses.push({
      issueId: String(issue._id),
      key: issue.key,
      type,
      priority,
      assignee:
        issue.assigneeDisplayName ||
        issue.assigneeEmail ||
        issue.assignee ||
        null,
      ageDays,
      cycleTimeDays,
      flags,
      createdAt,
      firstInProgress,
      doneAt,
    });
  }

  // Rank by severity and age
  rootCauses.sort((a, b) => {
    const score = (rc) => {
      let s = 0;
      if (rc.flags.includes("critical_bug")) s += 50;
      if (rc.flags.includes("bug")) s += 20;
      if (rc.flags.includes("long_running")) s += 15;
      if (rc.flags.includes("slow_cycle")) s += 10;
      if (typeof rc.ageDays === "number") s += rc.ageDays / 2;
      return s;
    };
    return score(b) - score(a);
  });

  const topRootCauses = rootCauses.slice(0, 10);

  const timeline = [];
  if (deadline) {
    timeline.push({
      date: deadline,
      kind: "deadline",
      key: epic.key,
      label: "Target date",
    });
  }
  if (closedAt) {
    timeline.push({
      date: closedAt,
      kind: "closed",
      key: epic.key,
      label: "Epic closed",
    });
  }

  return {
    epic: {
      id: String(epic._id),
      key: epic.key,
      title: epic.title || epic.summary || epic.key,
      outcomeBand,
      slipDays,
      deadline,
      closedAt,
    },
    rootCauses: topRootCauses,
    timeline,
  };
}
