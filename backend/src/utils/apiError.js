// src/utils/apiError.js

export function sendError(res, status, code, message, extra = {}) {
  return res.status(status).json({
    ok: false,
    errorCode: code, // machine-friendly
    error: message, // human-friendly, keeps old "error" string
    ...extra, // optional context: { details: ... }
  });
}
