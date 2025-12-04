import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  getIntegrationsForWorkspace,
  getIntegrationById,
  connectJiraIntegration,
} from "../controllers/IntegrationController.js";
// import {
//   getIntegrationsForWorkspace,
//   getIntegrationById,
// } from "../controllers/integrationController.js";

const router = Router();
router.use(auth);
// public list (no auth for now – uses all integrations)
router.get("/", getIntegrationsForWorkspace);

// connect Jira (public for now – will infer workspace)
router.post("/jira/connect", connectJiraIntegration);
router.get("/:id", getIntegrationById);

export default router;
