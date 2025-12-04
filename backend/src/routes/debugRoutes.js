// src/routes/debugRoutes.js
import express from "express";
import { auth } from "../middleware/authMiddleware.js";
import { debugGuard } from "../middleware/debugGuard.js";
import { getDebugStats } from "../controllers/debugController.js";

const router = express.Router();
router.use(auth);
router.use(debugGuard);

router.get("/stats", getDebugStats);

export default router;
