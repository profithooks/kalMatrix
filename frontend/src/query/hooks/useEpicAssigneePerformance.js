// src/query/hooks/useEpicAssigneePerformance.js
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

export function useEpicAssigneePerformance(epicId) {
  const user = useAuthStore((s) => s.user);
  const workspaceId = user?.workspaceId || user?.workspace?.id;

  return useQuery({
    enabled: !!workspaceId && !!epicId,
    queryKey: ["epic", workspaceId, epicId, "assignee-performance"],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/predictions/workspaces/${workspaceId}/epics/${epicId}/assignees`
      );
      const { epicId: eid, assignees = [] } = res.data || {};

      const normalized = assignees.map((a) => ({
        assignee: {
          id: a.id,
          displayName: a.name,
          email: a.email,
        },
        issuesTotal: a.totalIssues,
        issuesDone: a.doneIssues,
        issuesOpen: a.openIssues,
        reliability: a.reliabilityScore,
        avgCycleTimeDays: a.avgCycleTimeDays,
        lastTouchedAt: a.lastActivity,
      }));

      return { epicId: eid, assignees: normalized };
    },
  });
}
