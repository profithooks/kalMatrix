// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";

export const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    // Support:
    // - "Bearer <token>"
    // - "<token>"
    let token = authHeader;
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      // Header present but no actual token
      return res.status(401).json({ error: "Invalid token" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Misconfigured server – fail closed
      return res.status(500).json({ error: "Server auth misconfigured" });
    }

    const decoded = jwt.verify(token, secret);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = {
      id: decoded.userId,
      workspaceId: decoded.workspaceId,
      role: decoded.role,
      email: decoded.email,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
