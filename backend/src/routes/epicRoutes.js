import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import {
  getEpicsWithPrediction,
  getEpicRiskSummary,
  getEpicSlipChain,
  simulateEpicScenario,
} from "../controllers/epicController.js";

const router = Router();
router.use(auth);
// TEMP: make /epics/risk public so FE works before login flow
router.get("/risk", getEpicRiskSummary);

// Everything else protected

router.get("/", getEpicsWithPrediction);
// Slip chain analysis for a single epic
router.get("/:epicId/slip-chain", getEpicSlipChain);
router.post("/:epicId/simulate", simulateEpicScenario);

export default router;
