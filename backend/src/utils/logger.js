// src/utils/logger.js
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: null, // removes pid, hostname → cleaner logs
  timestamp: pino.stdTimeFunctions.isoTime, // ISO timestamps
});

// ----------
// Core logging wrappers
// ----------
export function logInfo(message, data = {}) {
  logger.info({ ...data, msg: message });
}

export function logError(message, data = {}) {
  logger.error({ ...data, msg: message });
}

// NEW ↓↓↓
export function logWarn(message, data = {}) {
  logger.warn({ ...data, msg: message });
}

// Keep raw logger if needed
export default logger;
