// src/query/hooks/useWeeklyAccountabilitySummary.js
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

/**
 * Fetch per-user weekly accountability metrics for this workspace.
 * Backend: GET /api/workspaces/:workspaceId/weekly-checkins/accountability
 */
export function useWeeklyAccountabilitySummary(options = {}) {
  const { weeks = 8 } = options;
  const { user } = useAuthStore();
  const workspaceId = user?.workspaceId;

  return useQuery({
    enabled: Boolean(workspaceId),
    queryKey: ["weeklyCheckins", "accountability", workspaceId, weeks],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/workspaces/${workspaceId}/weekly-checkins/accountability`,
        {
          params: { weeks },
        }
      );
      // Expect shape: { ok, data: { range, users } }
      return res.data?.data || { range: null, users: [] };
    },
  });
}
