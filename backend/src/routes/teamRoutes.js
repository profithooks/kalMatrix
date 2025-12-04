import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import { getTeamsRisk } from "../controllers/teamController.js";

const router = Router();

// all team endpoints are authenticated
router.use(auth);

// GET /teams/risk
router.get("/risk", getTeamsRisk);

export default router;
