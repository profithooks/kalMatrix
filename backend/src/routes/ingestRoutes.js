// src/routes/ingestRoutes.js
import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  triggerAzureEpicSync,
  triggerJiraEpicSync,
  triggerGithubRepoSync,
} from "../controllers/ingestController.js";

const router = Router();

// All ingest endpoints require auth
router.use(auth);

// POST /ingest/jira/epics
router.post("/jira/epics", triggerJiraEpicSync);

// POST /ingest/azure/epics
router.post("/azure/epics", triggerAzureEpicSync);

// POST /ingest/github/repos
router.post("/github/repos", triggerGithubRepoSync);

export default router;
