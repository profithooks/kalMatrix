import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

/**
 * Build human-readable signals for one epic
 * using backend "reasons" + any recentSignals we have.
 */
function buildSignals(epic) {
  const signals = [];

  // 1) Use backend reasons array as primary signals
  if (Array.isArray(epic.reasons) && epic.reasons.length > 0) {
    for (const r of epic.reasons) {
      if (typeof r === "string" && r.trim()) {
        signals.push(r.trim());
      }
    }
  }

  // 2) Recent signals (completion %, stale items, etc.)
  const rs = epic.recentSignals || {};
  const open =
    typeof rs.openIssuesCount === "number" ? rs.openIssuesCount : null;
  const done =
    typeof rs.doneIssuesCount === "number" ? rs.doneIssuesCount : null;

  if (open !== null && done !== null) {
    const total = open + done;
    if (total > 0) {
      const pct = Math.round((done / total) * 100);
      signals.push(`Issues completed: ${done}/${total} (${pct}%)`);
    } else {
      signals.push("No issues linked to this epic yet");
    }
  }

  if (typeof rs.commitsLast7d === "number") {
    if (rs.commitsLast7d === 0) {
      signals.push("No commits in last 7 days");
    } else {
      signals.push(`${rs.commitsLast7d} commits in last 7 days`);
    }
  }

  if (typeof rs.prsStaleGt3d === "number" && rs.prsStaleGt3d > 0) {
    signals.push(`${rs.prsStaleGt3d} PRs stale >3 days`);
  }

  if (
    typeof rs.issuesStuckInReviewGt3d === "number" &&
    rs.issuesStuckInReviewGt3d > 0
  ) {
    signals.push(`${rs.issuesStuckInReviewGt3d} issues stuck in review`);
  }

  if (!signals.length) {
    signals.push("No strong signals");
  }

  return signals;
}

/**
 * Map /api/workspaces/:workspaceId/epics/risk response
 * to the shape used by DeliveryRadar, Epics, SignalsDrawer, Dashboard.
 */
function mapApiToUi(apiData) {
  if (!apiData || apiData.ok === false) {
    return { epics: [], summary: null, meta: null };
  }

  const epics = (apiData.epics || []).map((epic) => {
    const rawScore = epic.riskScore ?? 0; // 0–100
    const normalized = Math.max(0, Math.min(rawScore / 100, 1)); // 0–1

    const id =
      epic.id ||
      epic.epicId ||
      (typeof epic._id === "string"
        ? epic._id
        : epic._id && epic._id.$oid
        ? epic._id.$oid
        : null) ||
      epic.key;

    const title =
      epic.title ||
      epic.name ||
      epic.summary ||
      epic.epic ||
      epic.key ||
      "Untitled epic";

    const windowLabel = epic.window || "Unknown";

    // signals from reasons + recentSignals
    const signals = buildSignals(epic);

    const riskSummary = epic.riskSummary || null;
    const recovery = epic.recovery || null;
    const team = epic.team || null;

    const predictionIntelligence = epic.predictionIntelligence || null;

    return {
      // identity + labels
      id,
      epic: title, // used by table / detail screen
      title, // explicit title
      key: epic.key || null,
      state: epic.state || null,
      statusCategory: epic.statusCategory || null,

      // risk
      risk: normalized,
      riskScore: rawScore,
      band: epic.band || null,
      window: windowLabel,
      signals,

      startDate: epic.startedAt || epic.createdAtJira || null,
      dueDate: epic.targetDelivery || epic.deadline || null,

      assignees: epic.assignees || [],

      riskSummary,
      recovery,
      team,

      predictionIntelligence, // <-- promoted to top-level

      // keep full raw for debugging / future
      raw: epic,
    };
  });

  const apiSummary = apiData.summary || {};
  const summary = {
    totalEpics: apiSummary.total ?? epics.length,
    healthy: apiSummary.healthy ?? 0,
    atRisk: apiSummary.atRisk ?? 0,
    redZone: apiSummary.redZone ?? 0,
  };

  return {
    epics,
    summary,
    meta: apiData.meta || null,
  };
}

export function useEpicRiskData() {
  const { user } = useAuthStore();
  const workspaceId = user?.workspaceId;

  return useQuery({
    enabled: !!workspaceId,
    queryKey: ["epics", "risk", workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/workspaces/${workspaceId}/epics/risk`
      );
      console.log(
        "DEBUG ARF-2 from API",
        res?.data?.epics?.find((e) => e.key === "ARF-2")
      );
      return mapApiToUi(res.data);
    },
  });
}
