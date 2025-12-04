import { rebuildPredictionsForWorkspace } from "../services/predictionService.js";

export const rebuildPredictions = async (req, res) => {
  try {
    const workspaceId = req.user.workspaceId;

    const result = await rebuildPredictionsForWorkspace(workspaceId);

    return res.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    logError("rebuildPredictions error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({
      ok: false,
      error: err.message || "Failed to rebuild predictions",
    });
  }
};
