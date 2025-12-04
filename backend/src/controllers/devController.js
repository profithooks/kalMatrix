import { seedMockData } from "../dev/mockData.js";
import { logError } from "../utils/logger.js";

export const seedWorkspace = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const result = await seedMockData(workspaceId);

    return res.json({
      ok: true,
      message: "Mock data seeded.",
      ...result,
    });
  } catch (err) {
    logError("seedWorkspace error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: "Failed to seed mock data" });
  }
};
