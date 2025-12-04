import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

export function usePendingCheckins() {
  const { user } = useAuthStore();
  const workspaceId = user?.workspaceId;

  return useQuery({
    enabled: !!workspaceId,
    queryKey: ["weekly-checkins", "pending", workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/workspaces/${workspaceId}/weekly-checkins/pending`
      );
      return res.data;
    },
  });
}
