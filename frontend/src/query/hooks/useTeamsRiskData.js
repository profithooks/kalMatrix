import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

function slugify(name, fallback) {
  if (!name) return fallback;
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

export function useTeamsRiskData() {
  return useQuery({
    queryKey: ["teams", "risk"],
    queryFn: async () => {
      const res = await apiClient.get("/teams/risk");
      const rawTeams = res.data?.teams || [];

      const teams = rawTeams.map((t, idx) => {
        // name can be string OR object { key, name, metrics }
        const displayName =
          typeof t.name === "string"
            ? t.name
            : t.name && typeof t.name === "object"
            ? t.name.name || t.name.key || t.id || "Unassigned"
            : t.id || "Unassigned";

        // use backend id first, fallback to slug
        const id = t.id || slugify(displayName, `team-${idx}`);

        // backend already gives teamRisk in 0–100
        const risk =
          typeof t.teamRisk === "number"
            ? t.teamRisk
            : typeof t.avgRiskScore === "number"
            ? t.avgRiskScore
            : 0;

        // epics live on activeEpics now
        const activeEpics = Array.isArray(t.activeEpics)
          ? t.activeEpics
          : Array.isArray(t.epics)
          ? t.epics
          : [];

        const epicCount =
          typeof t.epicCount === "number" ? t.epicCount : activeEpics.length;

        // for now keep fake confidence unless backend sends real one
        const confidence =
          Array.isArray(t.confidence) && t.confidence.length > 0
            ? t.confidence
            : [0.6, 0.7, 0.8, 0.75];

        return {
          id,
          name: displayName,
          teamRisk: risk,
          members: t.members || [],
          activeEpics,
          confidence,
          epicCount,
          redZoneCount: t.redZoneCount ?? 0,
          atRiskCount: t.atRiskCount ?? 0,
          healthyCount: t.healthyCount ?? 0,
        };
      });

      return { teams };
    },
  });
}
