// src/controllers/debugController.js
// import Workspace from "../models/workspaceModel.js";
// import Job from "../models/jobModel.js";
// import Epic from "../models/epicModel.js";
// import Integration from "../models/integrationModel.js";

import Epic from "../models/Epic.js";
import Integration from "../models/Integration.js";
import Job from "../models/Job.js";
import Workspace from "../models/Workspace.js";
import { logError } from "../utils/logger.js";

export const getDebugStats = async (req, res) => {
  try {
    // Basic system-level checks only. No secrets.
    const workspaceCount = await Workspace.countDocuments({});
    const integrationCount = await Integration.countDocuments({});
    const epicCount = await Epic.countDocuments({});
    const queuedJobs = await Job.countDocuments({ status: "queued" });
    const processingJobs = await Job.countDocuments({ status: "processing" });

    return res.json({
      ok: true,
      env: process.env.NODE_ENV || "development",

      system: {
        workspaces: workspaceCount,
        integrations: integrationCount,
        epics: epicCount,
        jobs: {
          queued: queuedJobs,
          processing: processingJobs,
        },
      },

      server: {
        uptimeSeconds: process.uptime(),
        memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        nodeVersion: process.version,
      },
    });
  } catch (err) {
    logError("debugStats error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({
      ok: false,
      error: "Failed to fetch debug stats",
      details: err.message,
    });
  }
};
