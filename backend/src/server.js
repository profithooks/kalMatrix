import "./config/env.js";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import cron from "node-cron";
import Integration from "./models/Integration.js";

connectDB();

const app = express();
import { requestLogger } from "./middleware/requestLogger.js";
app.use(requestLogger);
// Global limiter (if you already have one, keep it)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});
// app.use(globalLimiter);
app.use((req, res, next) => {
  // Skip global limiter for load-testing and business endpoints
  const skipPrefixes = [
    "/health",
    "/readiness",
    "/api/workspaces",
    "/api/epics",
    "/api/predictions",
    "/api/teams",
    "/api/integrations",
    "/epics",
  ];

  if (skipPrefixes.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  return globalLimiter(req, res, next);
});

// Stricter limiter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { ok: false, error: "Too many login/signup attempts" },
});
// ---- Security & CORS ----

// Basic security headers
app.use(helmet());

// CORS – in dev allow all; in prod control via env
// CORS – in dev allow all; in prod require explicit origins
const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.CORS_ORIGINS) {
  throw new Error(
    "CORS_ORIGINS must be set in production (comma-separated list of allowed origins)"
  );
}

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : true; // true = reflect request origin (dev only)

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// ---- Rate limiting for heavy endpoints ----

const rebuildLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // max 10 calls per 5 min per IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  express.json({
    limit: "1mb",
  })
);

// Basic liveness check

// Readiness: only "ready" if DB connection is established
app.get("/readiness", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1; // 1 = connected

  if (!dbReady) {
    return res.status(503).json({
      ok: false,
      dbReady,
    });
  }

  return res.json({
    ok: true,
    dbReady,
  });
});

app.get("/", (req, res) => {
  res.send("Hamza API is running. Delivery Radar backend active.");
});

// Basic health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "hamza-api", time: new Date() });
});

import jiraOAuthRoutes from "./routes/jiraOAuthRoutes.js";
app.use("/integrations/jira", jiraOAuthRoutes);

// Load routes
import authRoutes from "./routes/authRoutes.js";
app.use("/auth", authLimiter, authRoutes);

import WorkspaceRoutes from "./routes/WorkspaceRoutes.js";
app.use("/workspace", WorkspaceRoutes); // keep legacy
app.use("/api/workspaces", WorkspaceRoutes);

import integrationRoutes from "./routes/IntegrationRoutes.js";
app.use("/integrations", integrationRoutes);

import epicRoutes from "./routes/epicRoutes.js";
app.use("/epics", epicRoutes);

import devRoutes from "./routes/devRoutes.js";
app.use("/dev", devRoutes);

import ingestRoutes from "./routes/ingestRoutes.js";
app.use("/ingest", ingestRoutes);

app.use("/api/predictions/rebuild", rebuildLimiter);
app.use("/api/jobs/predictions/rebuild", rebuildLimiter);

import predictionRoutes from "./routes/predictionRoutes.js";
app.use("/api/predictions", predictionRoutes);

import integrationSyncRoutes from "./routes/integrationSyncRoutes.js";
app.use("/integrations", integrationSyncRoutes);

import teamRoutes from "./routes/teamRoutes.js";
app.use("/teams", teamRoutes);

import weeklyCheckinRoutes from "./routes/weeklyCheckinRoutes.js";
app.use("/api", weeklyCheckinRoutes);

import epicOutcomeRoutes from "./routes/epicOutcomeRoutes.js";
app.use("/api", epicOutcomeRoutes);

import jiraEpicRoutes from "./routes/jiraEpicRoutes.js";
app.use("/api", jiraEpicRoutes);

import epicRiskRoutes from "./routes/epicRiskRoutes.js";
app.use("/api", epicRiskRoutes);

import jobRoutes from "./routes/jobRoutes.js";
app.use("/api/jobs", jobRoutes);

import integrationStatusRoutes from "./routes/integrationStatusRoutes.js";
app.use("/api", integrationStatusRoutes);

import predictionAccuracyRoutes from "./routes/predictionAccuracyRoutes.js";
app.use("/api/predictions", predictionAccuracyRoutes);

import debugRoutes from "./routes/debugRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { ensureAccessToken } from "./services/jiraClient.js";
import { syncJiraEpicsForWorkspace } from "./services/jiraService.js";
app.use("/api/debug", debugRoutes);
app.use(errorHandler);
if (process.env.NODE_ENV !== "production") {
  app.get("/debug/jira-env", (req, res) => {
    res.json({
      jiraRedirectUri: process.env.JIRA_REDIRECT_URI,
      appUrl: process.env.APP_URL,
      clientIdPresent: !!process.env.JIRA_CLIENT_ID,
    });
  });
}
console.log(Date.now() + 5 * 60 * 1000);

// cron.schedule("0 */6 * * *", async () => {
//   const integrations = await Integration.find({
//     type: "jira",
//     status: "connected",
//   });

//   for (const integ of integrations) {
//     try {
//       await ensureAccessToken(integ); // this triggers refresh if needed
//       console.log("Refreshed Jira tokens for", integ._id);
//     } catch (err) {
//       console.error("Silent refresh failed for", integ._id, err.message);
//     }
//   }
// });
cron.schedule("0 3 * * *", async () => {
  console.log("Nightly 3AM Jira sync started...");

  const integrations = await Integration.find({
    type: "jira",
    status: "connected",
  });

  for (const integ of integrations) {
    try {
      // This will internally find the Jira integration again and call coreSync
      await syncJiraEpicsForWorkspace(integ.workspaceId);
      console.log(
        "Synced Jira for workspace",
        String(integ.workspaceId),
        "integration",
        String(integ._id)
      );
    } catch (err) {
      console.error(
        "Nightly Jira sync failed for",
        String(integ._id),
        err.message
      );
    }
  }

  console.log("Nightly 3AM Jira sync finished.");
});

const PORT = process.env.PORT || 4000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
export default app;
