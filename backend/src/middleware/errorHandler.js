// src/middleware/errorHandler.js
import { logError } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
  // Fallback if err is not an Error instance
  const message = err && err.message ? err.message : String(err);

  logError("Unhandled error", {
    message,
    stack: err?.stack,
    path: req.path,
    method: req.method,
    userId: req.user?._id?.toString(),
    workspaceId: req.user?.workspaceId?.toString(),
  });

  // Never leak stack to client
  const status =
    err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;

  res.status(status).json({
    ok: false,
    error: status === 500 ? "Internal server error" : message,
  });
}
