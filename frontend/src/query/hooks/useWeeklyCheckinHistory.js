// src/query/hooks/useWeeklyCheckinHistory.js
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

export function useWeeklyCheckinHistory(workspaceId, options = {}) {
  const { epicId, enabled = true } = options;

  return useQuery({
    queryKey: ["weeklyCheckins", "history", workspaceId, epicId || null],
    enabled: Boolean(workspaceId) && enabled,
    queryFn: async () => {
      const params = {};
      if (epicId) params.epicId = epicId;
      params.limit = 100;

      const res = await apiClient.get(
        `/api/workspaces/${workspaceId}/weekly-checkins/history`,
        { params }
      );
      console.log("history res", res);
      return res.data; // { ok, items: [...] }
    },
  });
}
