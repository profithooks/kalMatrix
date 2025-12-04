// src/middleware/requestLogger.js
import { randomUUID } from "crypto";

/**
 * Request logging middleware.
 *
 * - Adds req.requestId (uses incoming x-request-id if present, else generates one)
 * - Logs method, path, status, duration, workspaceId
 * - Format: [REQ] { ...json... }
 */
export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  // Reuse request ID from upstream if present; otherwise generate our own.
  const existingId = req.headers["x-request-id"];
  const requestId =
    typeof existingId === "string" && existingId.trim().length > 0
      ? existingId.trim()
      : randomUUID();

  req.requestId = requestId;

  res.on("finish", () => {
    try {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;

      const workspaceId =
        req.user?.workspaceId &&
        typeof req.user.workspaceId.toString === "function"
          ? req.user.workspaceId.toString()
          : null;

      const payload = {
        ts: new Date().toISOString(),
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: Math.round(durationMs),
        workspaceId,
      };

      // Keep it simple and structured; you can later swap this to pino.
      console.log("[REQ]", JSON.stringify(payload));
    } catch {
      // Logging must never crash the request
    }
  });

  next();
}
