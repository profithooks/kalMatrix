// src/routes/jiraOAuthRoutes.js
import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  jiraOAuthInitiate,
  jiraOAuthCallback,
} from "../controllers/jiraOAuthController.js";

const router = Router();
router.get("/oauth/callback", jiraOAuthCallback);
// Authenticated – user clicks "Connect Jira"
router.get("/oauth/initiate", auth, jiraOAuthInitiate);

// Public – Atlassian redirects here with ?code=&state=


export default router;
