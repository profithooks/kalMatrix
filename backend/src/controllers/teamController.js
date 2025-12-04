// src/controllers/teamController.js
import { getEpicRiskForWorkspace } from "../services/epicRiskService.js";
import { logError } from "../utils/logger.js";

export const getTeamsRisk = async (req, res) => {
  try {
    const workspaceId = req.user?.workspaceId;

    if (!workspaceId) {
      return res
        .status(401)
        .json({ ok: false, error: "Workspace not found on user" });
    }

    // Canonical source: already uses latest snapshots + P0 logic
    const { epics } = await getEpicRiskForWorkspace(workspaceId);

    if (!Array.isArray(epics) || epics.length === 0) {
      return res.json({ teams: [] });
    }

    const teamsMap = new Map();

    for (const epic of epics) {
      const teamKey =
        epic?.team?.key || epic?.teamKey || epic?.projectKey || "unassigned";
      console.log("teamName", epic);
      const teamName =
        epic?.team || epic?.teamName || epic?.project || "Unassigned";

      if (!teamsMap.has(teamKey)) {
        teamsMap.set(teamKey, {
          key: teamKey,
          name: teamName,

          epicCount: 0,
          totalRisk: 0,

          redZoneCount: 0,
          atRiskCount: 0,
          healthyCount: 0,

          activeEpics: [],
        });
      }

      const t = teamsMap.get(teamKey);

      const riskScore =
        typeof epic.riskScore === "number"
          ? epic.riskScore
          : typeof epic.probability === "number"
          ? epic.probability
          : 0; // 0–100

      const band = epic.band || "healthy";

      t.epicCount += 1;
      t.totalRisk += riskScore;

      if (band === "red_zone") t.redZoneCount += 1;
      else if (band === "at_risk") t.atRiskCount += 1;
      else t.healthyCount += 1;

      t.activeEpics.push({
        id: epic.id || epic.epicId,
        key: epic.key,
        name: epic.title || epic.summary || epic.key || "Untitled epic",
        riskScore, // 0–100
        window: epic.window || epic.forecastWindow || null,
      });
    }

    const teams = Array.from(teamsMap.values()).map((t) => {
      const teamRisk =
        t.epicCount > 0 ? Number((t.totalRisk / t.epicCount).toFixed(3)) : 0;

      return {
        id: t.key,
        name: t.name,

        teamRisk, // 0–100
        members: [], // can be wired later

        activeEpics: t.activeEpics,

        epicCount: t.epicCount,
        redZoneCount: t.redZoneCount,
        atRiskCount: t.atRiskCount,
        healthyCount: t.healthyCount,

        // confidence can be added later from PredictionSnapshot history
      };
    });

    // Sort high-risk teams first
    teams.sort((a, b) => b.teamRisk - a.teamRisk);

    return res.json({ teams });
  } catch (err) {
    logError("getTeamsRisk error", {
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};
