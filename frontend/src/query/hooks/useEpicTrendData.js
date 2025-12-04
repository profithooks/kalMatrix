// src/query/hooks/useEpicTrendData.js
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

export function useEpicTrendData(epicId) {
  const user = useAuthStore((s) => s.user);
  const workspaceId = user?.workspaceId || user?.workspace?.id;

  return useQuery({
    enabled: !!workspaceId && !!epicId,
    queryKey: ["epic-trend", workspaceId, epicId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/predictions/trend/${epicId}?days=30`
      );
      return res.data;
    },
  });
}
