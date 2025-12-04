import axios from "axios";
import Integration from "../models/Integration.js";
import Epic from "../models/Epic.js";

/**
 * Sync Azure Boards epics for a workspace.
 * This is a SKELETON – requires real Azure API token + org URL later.
 */
export const syncAzureEpicsForWorkspace = async (workspaceId) => {
  // 1) Find Azure Boards integration
  const integration = await Integration.findOne({
    workspaceId,
    type: "azure_boards",
    status: "connected",
  });

  if (!integration) {
    throw new Error(
      "No connected Azure Boards integration for this workspace."
    );
  }

  if (!integration.baseUrl || !integration.accessToken) {
    throw new Error("Azure Boards integration missing baseUrl or accessToken.");
  }

  const baseUrl = integration.baseUrl.replace(/\/$/, "");
  const token = integration.accessToken;

  // In real ingestion, we would call:
  //
  // GET https://dev.azure.com/{organization}/{project}/_apis/wit/wiql?api-version=7.1
  // With WIQL:
  // SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType]
  // FROM workitems
  // WHERE [System.WorkItemType] = 'Epic'
  //
  // For now: mock issues array so everything downstream works.

  const mockEpics = [
    {
      id: 98232,
      fields: {
        "System.Title": "Azure Epic - Revamp Pipeline",
        "System.State": "In Progress",
        "System.IterationPath": "Sprint 14",
        "System.Tags": "backend;infra",
      },
    },
  ];

  let upsertCount = 0;

  for (const wi of mockEpics) {
    const externalId = wi.id.toString();

    await Epic.findOneAndUpdate(
      { workspaceId, externalId },
      {
        workspaceId,
        externalId,
        source: "azure_boards",
        title: wi.fields["System.Title"],
        state: wi.fields["System.State"],
        team: wi.fields["System.IterationPath"] || null,
        tags: wi.fields["System.Tags"]
          ? wi.fields["System.Tags"].split(";")
          : [],
      },
      { upsert: true, new: true }
    );

    upsertCount++;
  }

  return { upserted: upsertCount };
};
