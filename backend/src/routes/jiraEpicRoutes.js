import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import { getEpicJiraDetail } from "../controllers/jiraEpicController.js";

const router = Router();
router.use(auth);

router.get("/workspaces/:workspaceId/epics/:epicId/jira", getEpicJiraDetail);

export default router;
