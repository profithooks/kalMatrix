import Integration from "../models/Integration.js";
import { z } from "zod";
import { logError } from "../utils/logger.js";

const connectSchema = z.object({
  type: z.string(), // "jira", "azure_boards", "github", etc.
  baseUrl: z.string().url().optional(),
  name: z.string().optional(), // optional override
  email: z.string().email().optional(), // 🔴 ADD
  accessToken: z.string().optional(),
});

export const listIntegrations = async (req, res) => {
  try {
    const items = await Integration.find({
      workspaceId: req.user.workspaceId,
    }).sort({ createdAt: 1 });

    return res.json(items);
  } catch (err) {
    logError("listIntegrations error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: "Server error" });
  }
};

// This is a MOCK connect endpoint – no real OAuth yet
export const mockConnectIntegration = async (req, res) => {
  try {
    const parsed = connectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const { type, baseUrl, name, email, accessToken } = parsed.data;

    // upsert per workspace+type
    const integration = await Integration.findOneAndUpdate(
      { workspaceId: req.user.workspaceId, type },
      {
        workspaceId: req.user.workspaceId,
        type,
        email: email || null,
        accessToken: accessToken || null,
        name: name || inferNameFromType(type),
        vendor: inferVendorFromType(type),
        category: inferCategoryFromType(type),
        baseUrl: baseUrl || null,
        status: "connected",
        lastSyncAt: new Date(),
        lastSyncStatus: "ok",
        lastErrorMessage: null,
      },
      { new: true, upsert: true }
    );

    return res.json(integration);
  } catch (err) {
    logError("mockConnectIntegration error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: "Server error" });
  }
};

export const getIntegration = async (req, res) => {
  try {
    const { id } = req.params;
    const integration = await Integration.findOne({
      _id: id,
      workspaceId: req.user.workspaceId,
    });

    if (!integration) {
      return res.status(404).json({ error: "Integration not found" });
    }

    return res.json(integration);
  } catch (err) {
    logError("getIntegration error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: "Server error" });
  }
};

// helpers

function inferNameFromType(type) {
  switch (type) {
    case "jira":
      return "Jira Cloud";
    case "azure_boards":
      return "Azure Boards";
    case "github":
      return "GitHub";
    case "azure_repos":
      return "Azure Repos";
    case "gitlab":
      return "GitLab";
    case "slack":
      return "Slack";
    default:
      return type;
  }
}

function inferVendorFromType(type) {
  switch (type) {
    case "jira":
      return "Atlassian";
    case "azure_boards":
    case "azure_repos":
      return "Microsoft";
    case "github":
      return "GitHub";
    case "gitlab":
      return "GitLab Inc.";
    case "slack":
      return "Slack";
    default:
      return "Unknown";
  }
}

const inferCategory = (type) => {
  if (!type) return "other";
  const t = type.toLowerCase();
  if (t.includes("jira") || t.includes("azure") || t.includes("boards"))
    return "planning";
  if (t.includes("github") || t.includes("gitlab")) return "code";
  if (t.includes("circle") || t.includes("jenkins") || t.includes("deploy"))
    return "ci_cd";
  return "other";
};

export const getIntegrationsForWorkspace = async (req, res) => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ ok: false, error: "Workspace not found" });
    }

    const integrations = await Integration.find({ workspaceId })
      .sort({ createdAt: 1 })
      .lean();

    const mapped = integrations.map((i) => ({
      id: i._id.toString(),
      type: i.type,
      provider: i.provider,
      baseUrl: i.baseUrl,
      status: i.status || "connected",
      lastSyncAt: i.lastSyncAt || null,
      scopes: i.scopes || [],
      category: i.category || inferCategory(i.type),
      meta: i.meta || {},
      createdAt: i.createdAt,
    }));

    return res.json(mapped);
  } catch (err) {
    logError("getIntegrationsForWorkspace error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

export const getIntegrationById = async (req, res) => {
  try {
    const id = req.params.id;
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ ok: false, error: "Workspace not found" });
    }

    const integration = await Integration.findOne({
      _id: id,
      workspaceId,
    }).lean();

    if (!integration) {
      return res
        .status(404)
        .json({ ok: false, error: "Integration not found" });
    }

    return res.json(integration);
  } catch (err) {
    logError("getIntegrationById error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

const jiraConnectSchema = z.object({
  baseUrl: z.string().url(),
  apiToken: z.string().min(10),
  email: z.string().email(),
  projectKey: z.string().min(1),
});

export const connectJiraIntegration = async (req, res) => {
  try {
    const workspaceId = req.user?.workspaceId;

    if (!workspaceId) {
      return res
        .status(401)
        .json({ ok: false, error: "Workspace not found on user" });
    }

    const parsed = jiraConnectSchema.parse(req.body);

    const integration = await Integration.create({
      workspaceId,
      name: `Jira (${parsed.projectKey})`,
      category: "Issue Tracking",
      type: "jira",
      provider: "Jira Cloud",
      baseUrl: parsed.baseUrl,
      accessToken: parsed.apiToken,
      status: "connected",
      scopes: ["epics", "issues"],
      meta: {
        email: parsed.email,
        projectKey: parsed.projectKey,
      },
    });

    return res.json({ ok: true, integrationId: integration._id });
  } catch (err) {
    logError("connectJiraIntegration error", {
      error: err.message,
      stack: err.stack,
    });
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: err.flatten() });
    }
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};
