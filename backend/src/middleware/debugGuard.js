// src/middleware/debugGuard.js
import { logWarn } from "../utils/logger.js";

export function debugGuard(req, res, next) {
  // In non-production environments, allow everything to keep dev fast
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const user = req.user;

  if (!user) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (user.role !== "admin") {
    logWarn("Debug route blocked for non-admin user", {
      userId: user._id?.toString(),
      email: user.email,
    });

    return res.status(403).json({
      ok: false,
      error: "Forbidden: debug endpoints restricted",
    });
  }

  next();
}
