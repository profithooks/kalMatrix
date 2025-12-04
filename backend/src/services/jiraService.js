// src/services/jiraService.js
import Integration from "../models/Integration.js";
import Workspace from "../models/Workspace.js";
import {
  syncJiraEpicsForWorkspace as coreSyncJiraEpicsForWorkspace,
  backfillFinishedEpics as coreBackfillFinishedEpics,
} from "./jiraSyncService.js";

/**
 * High-level Jira service.
 * Looks up workspace + Jira integration, then calls the deep sync.
 */

export const syncJiraEpicsForWorkspace = async (workspaceId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    console.warn("[jiraService] No workspace found for id", workspaceId);
    return null;
  }

  const integration = await Integration.findOne({
    workspaceId,
    type: "jira",
    status: "connected",
  });

  if (!integration) {
    console.warn(
      "[jiraService] No connected Jira integration for workspace",
      workspaceId
    );
    return null;
  }

  // This calls the deep sync: epics + issues + signals
  return coreSyncJiraEpicsForWorkspace(workspace, integration);
};

export const backfillJiraFinishedEpics = async (workspaceId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    console.warn(
      "[jiraService] No workspace found for backfillJiraFinishedEpics",
      workspaceId
    );
    return null;
  }

  const integration = await Integration.findOne({
    workspaceId,
    type: "jira",
    status: "connected",
  });

  if (!integration) {
    console.warn(
      "[jiraService] No connected Jira integration for backfill",
      workspaceId
    );
    return null;
  }

  return coreBackfillFinishedEpics(workspace, integration);
};
