// src/services/jiraClient.js
import axios from "axios";
import Integration from "../models/Integration.js";
import { encryptSecret, decryptSecret } from "../utils/secretCrypto.js";
import { logError } from "../utils/logger.js";

const ATLASSIAN_AUTH_BASE = "https://auth.atlassian.com";

function buildJiraUrl(baseUrl, integration, path) {
  const cloudId = integration.meta?.cloudId;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // OAuth (cloud) – use Atlassian API gateway
  if (integration.meta?.authType === "oauth" && cloudId) {
    return `https://api.atlassian.com/ex/jira/${cloudId}${cleanPath}`;
  }

  // Fallback: direct site REST API (PAT mode)
  try {
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}${cleanPath}`;
  } catch {
    return `${baseUrl.replace(/\/$/, "")}${cleanPath}`;
  }
}

/**
 * Our canonical stored format in integration.meta.tokens:
 * {
 *   access_token: "<encrypted>",
 *   refresh_token: "<encrypted>",
 *   expires_at: <number> // ms since epoch
 *   scope: string[]      // optional
 * }
 */
function getDecryptedTokens(integration) {
  const tokens = integration.meta?.tokens;
  if (!tokens) return null;

  return {
    access_token: tokens.access_token
      ? decryptSecret(tokens.access_token)
      : null,
    refresh_token: tokens.refresh_token
      ? decryptSecret(tokens.refresh_token)
      : null,
    expires_at: tokens.expires_at || null,
    scope: tokens.scope || [],
  };
}

function buildEncryptedTokens(fromPlain) {
  if (!fromPlain) return {};
  return {
    access_token: fromPlain.access_token
      ? encryptSecret(fromPlain.access_token)
      : null,
    refresh_token: fromPlain.refresh_token
      ? encryptSecret(fromPlain.refresh_token)
      : null,
    expires_at: fromPlain.expires_at || null,
    scope: fromPlain.scope || [],
  };
}

function isAccessTokenExpired(tokens) {
  if (!tokens?.access_token || !tokens?.expires_at) {
    return true;
  }
  const now = Date.now();
  // refresh 60s before real expiry
  return now > tokens.expires_at - 60_000;
}

async function refreshAtlassianToken(integration) {
  const existing = getDecryptedTokens(integration);
  if (!existing?.refresh_token) {
    throw new Error("No refresh_token available for Jira OAuth integration.");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", process.env.JIRA_CLIENT_ID);
  params.append("client_secret", process.env.JIRA_CLIENT_SECRET);
  params.append("refresh_token", existing.refresh_token);

  try {
    const res = await axios.post(
      `${ATLASSIAN_AUTH_BASE}/oauth/token`,
      params.toString(),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const newPlain = {
      access_token: res.data.access_token,
      // Atlassian may or may not rotate the refresh token
      refresh_token: res.data.refresh_token || existing.refresh_token,
      expires_at: Date.now() + res.data.expires_in * 1000,
      scope: existing.scope || [],
    };

    const encryptedTokens = buildEncryptedTokens(newPlain);

    // Persist only the token blob, WITHOUT triggering full validation
    await Integration.updateOne(
      { _id: integration._id },
      {
        $set: {
          "meta.tokens": encryptedTokens,
        },
      },
      { runValidators: false }
    );

    const oldPrefix = existing.refresh_token
      ? existing.refresh_token.slice(0, 12)
      : null;
    const newPrefix = newPlain.refresh_token
      ? newPlain.refresh_token.slice(0, 12)
      : null;

    console.log("[TOKEN] Refresh token updated in DB ✓", {
      integrationId: integration._id?.toString?.() ?? integration._id,
      oldPrefix,
      newPrefix,
    });

    // Keep in-memory copy in sync for this request
    integration.meta = integration.meta || {};
    integration.meta.tokens = encryptedTokens;

    return newPlain; // decrypted tokens for caller
  } catch (err) {
    const status = err.response?.status;
    const error = err.response?.data?.error;

    logError("Jira token refresh error", {
      status,
      data: err.response?.data,
      message: err.message,
    });

    // Refresh token dead / revoked
    if (
      (status === 400 || status === 401 || status === 403) &&
      (error === "unauthorized_client" || error === "invalid_grant")
    ) {
      try {
        await Integration.updateOne(
          { _id: integration._id },
          {
            $set: {
              lastSyncStatus: "error",
              lastErrorMessage:
                "Jira authorization expired or was revoked. Please reconnect from the Integrations page.",
              "meta.tokens": {}, // wipe tokens
            },
          },
          { runValidators: false }
        );
      } catch (saveErr) {
        logError("Failed to mark Jira integration as expired", {
          message: saveErr.message,
        });
      }

      throw new Error(
        "Jira connection expired (refresh token invalid). Please reconnect from the Integrations page."
      );
    }

    throw err;
  }
}

export async function ensureAccessToken(integration) {
  if (integration.meta?.authType !== "oauth") return null;

  let tokens = getDecryptedTokens(integration);

  console.log("[TOKEN] ensureAccessToken", {
    integrationId: integration._id?.toString?.() ?? integration._id,
    expires_at: tokens?.expires_at,
    now: Date.now(),
  });

  if (!tokens?.access_token) {
    throw new Error(
      "Jira OAuth integration has no access_token stored. Reconnect Jira from the UI."
    );
  }

  // No refresh token? Use current access token; if it dies, callJira will surface error.
  if (!tokens.refresh_token) {
    console.log("[TOKEN] No refresh_token; using existing access token only");
    return tokens.access_token;
  }

  if (isAccessTokenExpired(tokens)) {
    console.log(
      "[TOKEN] Access token expired / near expiry → refreshing via refresh_token..."
    );
    tokens = await refreshAtlassianToken(integration);
  } else {
    console.log("[TOKEN] Access token still valid; using existing");
  }

  return tokens.access_token;
}

export async function callJira(
  baseUrl,
  integration,
  path,
  paramsOrOptions = {}
) {
  const url = buildJiraUrl(baseUrl, integration, path);

  const options =
    paramsOrOptions &&
    (paramsOrOptions.params ||
      paramsOrOptions.method ||
      paramsOrOptions.headers ||
      paramsOrOptions.data)
      ? paramsOrOptions
      : { params: paramsOrOptions };

  let headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  // Attach auth
  if (integration.meta?.authType === "oauth") {
    const token = await ensureAccessToken(integration);
    headers.Authorization = `Bearer ${token}`;
  } else if (integration.meta?.authType === "pat" && integration.meta.token) {
    // PAT mode – still stored plain for now
    headers.Authorization = `Bearer ${integration.meta.token}`;
  }

  try {
    const resp = await axios.request({
      method: options.method || "GET",
      url,
      headers,
      params: options.params,
      data: options.data,
    });
    return resp.data;
  } catch (err) {
    const status = err.response?.status;

    // If token expired/invalid, refresh once and retry
    if (status === 401 && integration.meta?.authType === "oauth") {
      const decrypted = getDecryptedTokens(integration);
      if (decrypted?.refresh_token) {
        try {
          const newTokens = await refreshAtlassianToken(integration);
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${newTokens.access_token}`,
          };

          const retryResp = await axios.request({
            method: options.method || "GET",
            url,
            headers: retryHeaders,
            params: options.params,
            data: options.data,
          });
          return retryResp.data;
        } catch (refreshErr) {
          logError("Jira refresh + retry failed", {
            status: refreshErr.response?.status,
            data: refreshErr.response?.data,
            message: refreshErr.message,
          });
        }
      }
    }

    logError("Jira API error", {
      status: err.response?.status,
      data: err.response?.data,
      url,
      origin: baseUrl,
    });

    throw new Error(
      `Jira API ${status || "error"}: ${
        err.response?.data ? JSON.stringify(err.response.data) : err.message
      }`
    );
  }
}
