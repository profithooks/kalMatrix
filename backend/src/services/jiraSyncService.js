// hamza-api/src/services/jiraSyncService.js

import Integration from "../models/Integration.js";
import Epic from "../models/Epic.js";
import Issue from "../models/Issue.js";
import DailyEpicSignal from "../models/DailyEpicSignal.js";
import { callJira } from "./jiraClient.js";
import { startOfDay } from "date-fns";
import { normalizeJiraEpic } from "../utils/epicNormalizer.js";
import { logInfo } from "../utils/logger.js";

// ---------- Helpers ----------

function extractDescription(descField) {
  if (!descField) return "";

  if (typeof descField === "string") return descField;

  try {
    let text = "";

    const walk = (node) => {
      if (!node) return;
      if (node.text) text += node.text + " ";
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(walk);
      }
    };

    if (descField.content && Array.isArray(descField.content)) {
      descField.content.forEach(walk);
    }

    return text.trim() || JSON.stringify(descField);
  } catch (e) {
    return JSON.stringify(descField);
  }
}
function extractStoryPoints(fields = {}) {
  // Try common Jira fields – adjust if your instance uses a different customfield
  const candidates = [
    fields.storyPoints,
    fields.customfield_10016,
    fields["Story Points"],
  ].filter((v) => v !== null && v !== undefined);

  const value = candidates[0];
  return typeof value === "number" ? value : null;
}

// Fetch full issue (with fields + comments + changelog)
async function fetchFullIssue(baseUrl, integration, issueKeyOrId) {
  return await callJira(
    baseUrl,
    integration,
    `/rest/api/3/issue/${issueKeyOrId}`,
    {
      fields:
        "summary,description,issuetype,status,parent,project,comment,assignee,priority,created,updated,resolutiondate",
      expand: "changelog",
    }
  );
}

function getOrigin(baseUrl) {
  try {
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return baseUrl;
  }
}

function extractAssignees(fields) {
  const assignee = fields.assignee;
  if (!assignee) return [];
  return [
    {
      accountId: assignee.accountId,
      displayName: assignee.displayName,
      email: assignee.emailAddress,
    },
  ];
}

function mapStatusNameToCategory(name) {
  const s = (name || "").toLowerCase();

  if (
    s === "to do" ||
    s === "open" ||
    s === "backlog" ||
    s === "selected for development"
  ) {
    return "todo";
  }

  if (
    s === "in progress" ||
    s === "doing" ||
    s === "development" ||
    s === "implementing"
  ) {
    return "in_progress";
  }

  if (
    s === "in review" ||
    s === "code review" ||
    s === "qa" ||
    s === "testing"
  ) {
    return "review";
  }

  if (
    s === "done" ||
    s === "closed" ||
    s === "resolved" ||
    s === "cancelled" ||
    s === "won't do"
  ) {
    return "done";
  }

  return null;
}

function extractStatusHistory(changelog) {
  if (!changelog || !changelog.histories) return [];

  const history = [];

  // Jira sends histories in chronological order
  changelog.histories.forEach((h) => {
    const when = new Date(h.created);

    h.items
      .filter((i) => i.field === "status")
      .forEach((i) => {
        const category = mapStatusNameToCategory(i.toString);

        // close previous segment
        if (history.length > 0) {
          const last = history[history.length - 1];
          if (!last.to) {
            last.to = when;
          }
        }

        // open new segment
        history.push({
          status: i.toString,
          category,
          from: when,
          to: null,
        });
      });
  });

  return history;
}

function extractStartedAtFromChangelog(changelog) {
  if (!changelog || !changelog.histories) return null;
  // Very naive: first time status changed from "To Do" to anything else
  let started = null;
  changelog.histories.forEach((h) => {
    h.items
      .filter((i) => i.field === "status")
      .forEach((i) => {
        if (!started && i.fromString === "To Do" && i.toString !== "To Do") {
          started = new Date(h.created);
        }
      });
  });
  return started;
}

function extractClosedAtFromChangelog(changelog) {
  if (!changelog || !changelog.histories) return null;
  let closed = null;
  changelog.histories.forEach((h) => {
    h.items
      .filter((i) => i.field === "status")
      .forEach((i) => {
        if (i.toString === "Done") {
          closed = new Date(h.created);
        }
      });
  });
  return closed;
}

// Normalize Jira comment field to a simple string body + metadata
function extractComments(commentField) {
  if (!commentField || !commentField.comments) return [];

  return commentField.comments.map((c) => {
    let bodyText;

    if (typeof c.body === "string") {
      // Rare: plain string body
      bodyText = c.body;
    } else if (c.body && c.body.content) {
      // Atlassian Document Format: try to pull plain text from first paragraph
      try {
        const firstBlock = c.body.content[0];
        const firstParagraphContent = firstBlock?.content || [];
        bodyText =
          firstParagraphContent
            .map((node) => node.text)
            .filter(Boolean)
            .join(" ") || JSON.stringify(c.body);
      } catch {
        bodyText = JSON.stringify(c.body);
      }
    } else {
      // Fallback: JSON stringify whatever it is
      bodyText = JSON.stringify(c.body ?? "");
    }

    return {
      externalId: c.id,
      author: {
        accountId: c.author?.accountId,
        displayName: c.author?.displayName,
        email: c.author?.emailAddress,
      },
      body: bodyText, // always plain string (or JSON string)
      createdAt: c.created ? new Date(c.created) : null,
      updatedAt: c.updated ? new Date(c.updated) : null,
    };
  });
}

async function fetchJiraIssuesWithChangelog(baseUrl, integration, jql) {
  const results = [];
  let startAt = 0;
  const maxResults = 50;

  while (true) {
    const res = await callJira(baseUrl, integration, "/rest/api/3/search/jql", {
      jql,
      startAt,
      maxResults,
      expand: "changelog",
      // 👇 explicitly ask Jira for the fields we need on epics + issues
      fields:
        "summary,description,issuetype,status,parent,project,comment,assignee,reporter,priority,created,updated,duedate",
    });

    const issues = res.issues || [];

    results.push(...issues);

    if (startAt + issues.length >= (res.total || issues.length)) break;
    startAt += issues.length;
  }

  return results;
}

// ---------- Upserts ----------

export async function upsertEpicFromJiraIssue(
  workspace,
  integration,
  epicIssue
) {
  const workspaceId = workspace._id;
  const baseUrl = integration.baseUrl || integration.meta?.baseUrl || null;

  const { normalized, missingFields } = normalizeJiraEpic(epicIssue);

  if (missingFields.length > 0) {
    console.warn("[jiraSync] upsertEpicFromJiraIssue: missing epic data", {
      workspaceId: workspaceId.toString(),
      jiraId: epicIssue?.id,
      key: epicIssue?.key,
      missingFields,
    });
  }

  const team =
    integration.meta?.projectKey || epicIssue?.fields?.project?.key || null;

  const url =
    baseUrl && normalized.key ? `${baseUrl}/browse/${normalized.key}` : null;

  // Map normalized fields into Epic model fields.
  // We are NOT inventing start/target dates; if Jira had none, they stay null.
  const update = {
    workspaceId,
    externalId: normalized.externalId,
    source: "jira",

    key: normalized.key,
    title: normalized.title,
    description: normalized.description || null,

    team,
    state: normalized.statusName || "Unknown",
    statusCategory: normalized.statusCategory || "indeterminate",

    isActive: !normalized.isDone,
    startedAt: normalized.startedAt || null,
    targetDelivery: normalized.targetDelivery || null,

    url,

    // This assumes your Epic model has an `assignees` array.
    // If it's named differently in your schema, adjust only this field.
    assignees: normalized.assignees,
  };

  // Remove undefined to avoid overwriting with undefined
  Object.keys(update).forEach((k) => {
    if (update[k] === undefined) {
      delete update[k];
    }
  });

  // Upsert epic by (workspaceId + externalId)
  const epicDoc = await Epic.findOneAndUpdate(
    {
      workspaceId,
      externalId: normalized.externalId,
    },
    { $set: update },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return epicDoc;
}

async function upsertIssueFromJira(workspace, integration, epicDoc, issueData) {
  const { fields } = issueData;
  const origin = integration.baseUrl.replace(/\/+$/, "");

  const statusCategory = fields.status?.statusCategory?.key; // "new", "indeterminate", "done"
  const storyPoints = extractStoryPoints(fields);
  const assignees = extractAssignees(fields);
  const assignee = assignees[0] || null;

  const update = {
    workspaceId: workspace._id,
    epicId: epicDoc._id,
    externalId: issueData.id,
    key: issueData.key,
    source: "jira",

    type: fields.issuetype?.name,
    parentKey: fields.parent?.key || null,

    title: fields.summary || issueData.key,
    description: extractDescription(fields.description),
    url: `${origin}/browse/${issueData.key}`,

    status: fields.status?.name,
    statusCategory,

    assignee, // 👈 single owner
    assignees,

    storyPoints,
    priority: fields.priority?.name,

    statusHistory: extractStatusHistory(issueData.changelog),
    comments: extractComments(issueData),
    createdAtJira: fields.created ? new Date(fields.created) : null,
    updatedAtJira: fields.updated ? new Date(fields.updated) : null,
    resolvedAt: fields.resolutiondate ? new Date(fields.resolutiondate) : null,
  };

  await Issue.findOneAndUpdate(
    {
      workspaceId: workspace._id,
      externalId: issueData.id,
    },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ---------- Signals ----------

async function computeDailySignalsForEpic(workspace, epicId) {
  const epic = await Epic.findById(epicId);
  if (!epic) return;

  const issues = await Issue.find({ epicId: epic._id });

  const today = startOfDay(new Date());

  const openIssuesCount = issues.filter(
    (i) => i.statusCategory !== "done"
  ).length;
  const doneIssuesCount = issues.filter(
    (i) => i.statusCategory === "done"
  ).length;

  const storyPointsTotal = issues.reduce(
    (sum, i) => sum + (i.storyPoints || 0),
    0
  );
  const storyPointsCompleted = issues
    .filter((i) => i.statusCategory === "done")
    .reduce((sum, i) => sum + (i.storyPoints || 0), 0);

  await DailyEpicSignal.findOneAndUpdate(
    { epicId: epic._id, date: today },
    {
      $set: {
        workspaceId: workspace._id,
        openIssuesCount,
        doneIssuesCount,
        storyPointsTotal,
        storyPointsCompleted,
      },
    },
    { upsert: true }
  );
}

// ---------- Public API ----------

// Daily / incremental sync: pulls updated epics (active + done) for last 90 days across all projects
export async function syncJiraEpicsForWorkspace(workspace, integration) {
  if (!integration) throw new Error("Integration not provided to Jira sync");

  const baseUrl = integration.baseUrl || integration.meta?.baseUrl;

  if (!baseUrl) {
    throw new Error(
      "Jira integration missing baseUrl. Reconnect Jira from UI."
    );
  }

  const jql = `issuetype = Epic ` + `AND updated >= -90d ORDER BY updated DESC`;

  const epics = await fetchJiraIssuesWithChangelog(baseUrl, integration, jql);

  logInfo("jiraSync:epics_fetched", {
    workspaceId: String(workspace),
    integrationId: String(integration._id),
    epicCount: epics.length,
  });

  let processed = 0;
  let failed = 0;

  for (const epicIssue of epics) {
    if (!epicIssue) {
      console.warn(
        "[jiraSync] syncJiraEpicsForWorkspace: encountered undefined epic"
      );
      failed++;
      continue;
    }

    try {
      const epicDoc = await upsertEpicFromJiraIssue(
        workspace,
        integration,
        epicIssue
      );

      await syncIssuesForEpic(workspace, integration, epicDoc, epicIssue.key);
      await computeDailySignalsForEpic(workspace, epicDoc._id);

      processed++;
    } catch (e) {
      failed++;
      console.error(
        "[jiraSync] syncJiraEpicsForWorkspace: failed to process epic",
        epicIssue.key,
        "workspace",
        workspace._id.toString(),
        "error",
        e.message
      );
      // continue with other epics
    }
  }

  // Update integration lastSyncAt
  try {
    const now = new Date();
    await Integration.findByIdAndUpdate(integration._id, {
      lastSyncAt: now,
      status: "connected",
    });
  } catch (e) {
    console.error("[jiraSync] Failed to update lastSyncAt:", e.message);
  }

  return { total: epics.length, processed, failed };
}

// One-time (or rare) backfill: fetch finished epics for last 90 days across all projects
export async function backfillFinishedEpics(workspace, integration) {
  const baseUrl = integration.baseUrl || integration.meta?.baseUrl;

  if (!baseUrl) {
    throw new Error(
      "Jira integration missing baseUrl. Reconnect Jira from UI."
    );
  }

  const jql =
    `issuetype = Epic ` +
    `AND statusCategory = Done AND updated >= -90d ` +
    `ORDER BY updated DESC`;

  const epics = await fetchJiraIssuesWithChangelog(baseUrl, integration, jql);

  let processed = 0;
  let failed = 0;

  for (const epicIssue of epics) {
    if (!epicIssue) {
      console.warn(
        "[jiraSync] backfillFinishedEpics: encountered undefined epic"
      );
      failed++;
      continue;
    }

    try {
      const epicDoc = await upsertEpicFromJiraIssue(
        workspace,
        integration,
        epicIssue
      );
      await syncIssuesForEpic(workspace, integration, epicDoc, epicIssue.key);
      await computeDailySignalsForEpic(workspace, epicDoc._id);
      processed++;
    } catch (e) {
      failed++;
      console.error(
        "[jiraSync] backfillFinishedEpics: failed to process epic",
        epicIssue.key,
        "workspace",
        workspace._id.toString(),
        "error",
        e.message
      );
    }
  }

  return { total: epics.length, processed, failed };
}

// ---------- Internal ----------

async function syncIssuesForEpic(workspace, integration, epicDoc, epicKey) {
  const baseUrl = integration.baseUrl || integration.meta?.baseUrl;

  // Try new-style Jira relationship first – parent uniquely identifies the epic
  let jql = `parent = ${epicKey} ORDER BY updated DESC`;

  let issues = await fetchJiraIssuesWithChangelog(baseUrl, integration, jql);

  // Fallback: "Epic Link"
  if (!issues.length) {
    jql = `"Epic Link" = ${epicKey} ORDER BY updated DESC`;

    issues = await fetchJiraIssuesWithChangelog(baseUrl, integration, jql);
  }

  for (const jiraIssue of issues) {
    if (!jiraIssue) {
      console.warn(
        "[jiraSync] syncIssuesForEpic: encountered undefined issue for epic",
        epicKey
      );
      continue;
    }

    try {
      await upsertIssueFromJira(workspace, integration, epicDoc, jiraIssue);
    } catch (e) {
      console.error(
        "[jiraSync] syncIssuesForEpic: failed to upsert issue",
        jiraIssue.key,
        "for epic",
        epicKey,
        "workspace",
        workspace._id.toString(),
        "error",
        e.message
      );
      // keep going with other issues
    }
  }
}
