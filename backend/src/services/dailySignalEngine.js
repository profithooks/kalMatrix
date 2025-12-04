// src/services/dailySignalEngine.js
import Issue from "../models/Issue.js";
import Epic from "../models/Epic.js";
import DailyEpicSignal from "../models/DailyEpicSignal.js";
import { startOfDay, differenceInDays, subDays } from "date-fns";
import { logInfo } from "../utils/logger.js";

/**
 * We consider these textual statuses as "done" or "in review" fallbacks
 * in addition to any normalized statusCategory the Issue may carry.
 */
const DONE_STATUSES = ["done", "completed", "closed", "resolved"];
const REVIEW_STATUSES = [
  "in review",
  "review",
  "code review",
  "pr open",
  "testing",
];

/**
 * Generate daily aggregated signals for all active epics in a workspace.
 *
 * Called from predictionService.rebuildPredictionsForWorkspace and
 * batched by workspace to avoid N+1 Issue queries.
 */
export async function generateDailySignals(workspaceId) {
  const today = startOfDay(new Date());

  // 1) Load all active epics
  const epics = await Epic.find({ workspaceId, isActive: true }).lean();
  if (!epics.length) {
    return { totalEpics: 0, updatedSignals: 0 };
  }

  const epicIds = epics.map((e) => e._id);

  // 2) Load all issues for those epics in one go
  const issues = await Issue.find({
    workspaceId,
    epicId: { $in: epicIds },
  }).lean();

  // Group issues by epicId
  const issuesByEpic = new Map();
  for (const issue of issues) {
    const key = String(issue.epicId);
    if (!issuesByEpic.has(key)) issuesByEpic.set(key, []);
    issuesByEpic.get(key).push(issue);
  }

  let updatedSignals = 0;

  for (const epic of epics) {
    const epicKey = String(epic._id);
    const epicIssues = issuesByEpic.get(epicKey) || [];
    if (epicIssues.length === 0) continue;

    let doneCount = 0;
    let inProgressCount = 0;
    let inReviewCount = 0;
    let totalPoints = 0;
    let completedPoints = 0;
    let stuckInReviewCount = 0;
    let newIssuesCreatedToday = 0;

    const now = new Date();
    const yesterday = subDays(today, 1);

    for (const issue of epicIssues) {
      // Story points: try every possible field Jira might use
      const sp =
        issue.storyPoints ||
        issue.points ||
        issue.customfield_10016 || // Classic Jira
        issue.customfield_10026 || // Team-managed
        issue.customfield_10015 ||
        issue.fields?.storyPoints ||
        issue.fields?.customfield_10026 ||
        issue.fields?.customfield_10016 ||
        0;

      totalPoints += sp || 0;

      const rawStatus = (issue.status || "").toString().toLowerCase().trim();
      const cat = (issue.statusCategory || "").toString().toLowerCase().trim();

      const isDone =
        cat === "done" || DONE_STATUSES.some((s) => rawStatus.includes(s));
      const isReview =
        cat === "review" || REVIEW_STATUSES.some((r) => rawStatus.includes(r));

      if (isDone) {
        doneCount++;
        completedPoints += sp || 0;
      } else if (isReview) {
        inReviewCount++;
      } else {
        inProgressCount++;
      }

      // "stuck in review > 3 days"
      if (isReview) {
        const updated = new Date(
          issue.updatedAtJira || issue.updatedAt || issue.createdAt
        );
        if (differenceInDays(now, updated) > 3) {
          stuckInReviewCount++;
        }
      }

      // New issues created "today" (between yesterday and today)
      const created = new Date(
        issue.createdAtJira || issue.createdAt || issue.updatedAt || now
      );
      if (created >= yesterday && created < today) {
        newIssuesCreatedToday++;
      }
    }

    const openIssuesCount = epicIssues.length - doneCount;

    const daysSinceLastDone =
      doneCount > 0
        ? Math.min(
            ...epicIssues
              .filter((i) => {
                const st = (i.status || "").toString().toLowerCase().trim();
                return DONE_STATUSES.some((s) => st.includes(s));
              })
              .map((i) =>
                differenceInDays(
                  now,
                  new Date(i.updatedAtJira || i.updatedAt || now)
                )
              )
          )
        : differenceInDays(
            now,
            new Date(epic.startedAt || epic.createdAt || now)
          );

    const signal = {
      epicId: epic._id,
      workspaceId,
      date: today, // align with dailyPredictionEngine
      doneIssuesCount: doneCount,
      openIssuesCount,
      inProgressIssuesCount: inProgressCount,
      inReviewIssuesCount: inReviewCount,
      newIssuesCreatedToday,
      issuesStuckInReviewGt3d: stuckInReviewCount,
      storyPointsTotal: totalPoints,
      storyPointsCompleted: completedPoints,
      daysSinceLastDone,
      velocityLast7d:
        totalPoints > 0
          ? completedPoints /
            Math.max(
              1,
              differenceInDays(now, new Date(epic.startedAt || now)) / 7
            )
          : 0,
    };

    await DailyEpicSignal.findOneAndUpdate(
      { epicId: epic._id, date: signal.date },
      signal,
      { upsert: true }
    );

    updatedSignals++;
    logInfo("dailySignalEngine:signal_saved", {
      workspaceId: String(workspaceId),
      epicId: String(epic._id),
      epicKey: epic.key,
      issuesTotal: epicIssues.length,
      doneCount,
      storyPointsCompleted: completedPoints,
      storyPointsTotal: totalPoints,
      daysSinceLastDone,
    });
  }

  logInfo("dailySignalEngine:workspace_done", {
    workspaceId: String(workspaceId),
    epicsUpdated: updatedSignals,
    epicsTotal: epics.length,
  });

  return { totalEpics: epics.length, updatedSignals };
}
