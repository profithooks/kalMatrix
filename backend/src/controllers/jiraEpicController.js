// src/controllers/jiraEpicController.js
import Epic from "../models/Epic.js";
import Issue from "../models/Issue.js";
import { logError } from "../utils/logger.js";

export const getEpicJiraDetail = async (req, res) => {
  try {
    const { epicId } = req.params;
    const paramWorkspaceId = req.user.workspaceId;
    const authWorkspaceId = req.user?.workspaceId;

    if (!authWorkspaceId) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    if (
      paramWorkspaceId &&
      paramWorkspaceId.toString() !== authWorkspaceId.toString()
    ) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    const workspaceId = authWorkspaceId;

    const epic = await Epic.findOne({ _id: epicId, workspaceId });
    if (!epic) {
      return res.status(404).json({ ok: false, error: "Epic not found" });
    }

    const issues = await Issue.find({
      workspaceId,
      epicId: epic._id, // 🔑 DB link
    }).lean();

    // Group top-level issues (no parent) and attach children
    const issueMap = new Map();
    issues.forEach((issue) => {
      issue.children = [];
      issueMap.set(issue.externalId, issue);
    });

    const topLevel = [];
    issues.forEach((issue) => {
      if (issue.parentExternalId && issueMap.has(issue.parentExternalId)) {
        issueMap.get(issue.parentExternalId).children.push(issue);
      } else {
        topLevel.push(issue);
      }
    });

    return res.json({
      ok: true,
      epic: {
        id: epic._id,
        externalId: epic.externalId,
        key: epic.key,
        title: epic.title,
        state: epic.state,
        statusHistory: epic.statusHistory,
        startedAt: epic.startedAt,
        closedAt: epic.closedAt,
        url: epic.url,
        assignees: epic.assignees || [],
        reporter: epic.reporter || null,
        targetDelivery: epic.targetDelivery || null,
        createdAtJira: epic.createdAtJira || null,
      },
      issues: topLevel,
    });
  } catch (err) {
    logError("getEpicJiraDetail error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};
