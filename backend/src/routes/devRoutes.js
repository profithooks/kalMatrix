// src/routes/devRoutes.js
import { Router } from "express";
import { auth } from "../middleware/authMiddleware.js";
import { seedWorkspace } from "../controllers/devController.js";

const router = Router();

// Require auth for all dev routes
router.use(auth);

// Never allow /dev routes in production, even for authenticated users
router.use((req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      ok: false,
      error: "Forbidden: /dev routes are disabled in production",
    });
  }
  next();
});

// POST /dev/seed
router.post("/seed", seedWorkspace);

export default router;
