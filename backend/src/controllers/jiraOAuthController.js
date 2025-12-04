// src/controllers/jiraOAuthController.js
import axios from "axios";
import Integration from "../models/Integration.js";
import { syncJiraEpicsForWorkspace } from "../services/jiraSyncService.js";
import { encryptSecret } from "../utils/secretCrypto.js";
import { logError } from "../utils/logger.js";

function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeState(state) {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch (err) {
    logError("decodeState error", {
      error: err.message,
      stack: err.stack,
    });
    return null;
  }
}

// GET /integrations/jira/oauth/initiate  (auth protected)
export const jiraOAuthInitiate = async (req, res) => {
  // READ ENV HERE, NOT AT TOP
  const { JIRA_CLIENT_ID, JIRA_REDIRECT_URI } = process.env;

  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(401).json({ ok: false, error: "Workspace not found" });
    }

    if (!JIRA_CLIENT_ID || !JIRA_REDIRECT_URI) {
      return res
        .status(500)
        .json({ ok: false, error: "Jira OAuth not configured on server" });
    }

    const state = encodeState({
      workspaceId,
      ts: Date.now(),
    });

    const scopes = ["read:jira-work", "read:jira-user", "offline_access"].join(
      " "
    );

    const authorizeUrl =
      "https://auth.atlassian.com/authorize" +
      `?audience=api.atlassian.com` +
      `&client_id=${encodeURIComponent(JIRA_CLIENT_ID)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(JIRA_REDIRECT_URI)}` +
      `&state=${encodeURIComponent(state)}` +
      `&response_type=code` +
      `&prompt=consent`;

    return res.json({ authorizeUrl });
  } catch (err) {
    logError("jiraOAuthInitiate error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

// GET /integrations/jira/oauth/callback
// GET /integrations/jira/oauth/callback
export const jiraOAuthCallback = async (req, res) => {
  const { code, state } = req.query || {};
  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }

  const decoded = decodeState(state);
  const workspaceId = decoded?.workspaceId;
  if (!workspaceId) {
    return res.status(400).send("Invalid state");
  }

  const { JIRA_CLIENT_ID, JIRA_CLIENT_SECRET, JIRA_REDIRECT_URI, APP_URL } =
    process.env;

  try {
    // 1) Exchange code for tokens
    const tokenRes = await axios.post(
      "https://auth.atlassian.com/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: JIRA_CLIENT_ID,
        client_secret: JIRA_CLIENT_SECRET,
        code,
        redirect_uri: JIRA_REDIRECT_URI,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      scope,
    } = tokenRes.data;

    // 🔹 pack tokens the way jiraClient expects
    const tokens = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      obtainedAt: new Date().toISOString(),
    };

    // 2) Get accessible resources (cloudId + site URL)
    const resourcesRes = await axios.get(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const resources = resourcesRes.data || [];
    if (!resources.length) {
      return res.status(400).send("No Jira sites accessible for this account");
    }

    const jiraSite =
      resources.find((r) => (r.scopes || []).includes("read:jira-work")) ||
      resources[0];

    const cloudId = jiraSite.id;
    const siteUrl = jiraSite.url; // e.g. https://xxx.atlassian.net

    // 3) Upsert Integration
    // 3) Upsert Integration
    let integration = await Integration.findOne({
      workspaceId,
      type: "jira",
    });

    const scopeList = scope ? scope.split(" ") : [];

    // prepare encrypted tokens for storage
    const encryptedTokens = {
      access_token: encryptSecret(accessToken),
      refresh_token: encryptSecret(refreshToken),
      expires_at: Date.now() + expiresIn * 1000,
      scope: scopeList,
    };

    if (!integration) {
      integration = await Integration.create({
        workspaceId,
        type: "jira",
        name: "Jira Cloud",
        category: "Issue Tracking",
        provider: "Jira Cloud",
        status: "connected",
        baseUrl: siteUrl,
        scopes: scopeList,
        meta: {
          cloudId,
          authType: "oauth",
          tokens: encryptedTokens,
        },
      });
    } else {
      integration.baseUrl = siteUrl;
      integration.status = "connected";
      integration.scopes = scopeList;
      integration.meta = {
        ...(integration.meta || {}),
        cloudId,
        authType: "oauth",
        tokens: encryptedTokens,
      };
      await integration.save();
    }

    // 4) Kick off first sync (best-effort)
    try {
      await syncJiraEpicsForWorkspace({ _id: workspaceId }, integration);
    } catch (syncErr) {
      logError("jiraOAuthCallback error", {
        error: err.message,
        stack: err.stack,
      });
    }

    const redirectBase = APP_URL || "http://localhost:5173";
    return res.redirect(302, `${redirectBase}/integrations?jira_connected=1`);
  } catch (err) {
    logError("jiraOAuthCallback error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).send("Jira OAuth failed");
  }
};
