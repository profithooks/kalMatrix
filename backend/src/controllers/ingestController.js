import { syncAzureEpicsForWorkspace } from "../services/azureBoardsService.js";
import { syncGithubReposForWorkspace } from "../services/githubService.js";
import { syncJiraEpicsForWorkspace } from "../services/jiraService.js";
import { logError } from "../utils/logger.js";

export const triggerJiraEpicSync = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const result = await syncJiraEpicsForWorkspace(workspaceId);

    return res.json({
      ok: true,
      source: "jira",
      ...result,
    });
  } catch (err) {
    logError("triggerJiraEpicSync error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(400).json({
      ok: false,
      error: err.message || "Failed to sync Jira epics",
    });
  }
};

export const triggerAzureEpicSync = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const result = await syncAzureEpicsForWorkspace(workspaceId);

    return res.json({
      ok: true,
      source: "azure_boards",
      ...result,
    });
  } catch (err) {
    logError("triggerAzureEpicSync error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(400).json({
      ok: false,
      error: err.message || "Failed to sync Azure Boards epics",
    });
  }
};

export const triggerGithubRepoSync = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const result = await syncGithubReposForWorkspace(workspaceId);

    return res.json({
      ok: true,
      source: "github",
      ...result,
    });
  } catch (err) {
    logError("triggerGithubRepoSync error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(400).json({
      ok: false,
      error: err.message || "Failed to sync GitHub repos",
    });
  }
};
