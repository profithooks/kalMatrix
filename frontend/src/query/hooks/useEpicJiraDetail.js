import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

export function useEpicJiraDetail(epicId) {
  const user = useAuthStore((s) => s.user);
  const workspaceId = user?.workspaceId || user?.workspace?.id;

  return useQuery({
    enabled: !!workspaceId && !!epicId,
    queryKey: ["epic", workspaceId, epicId, "jira-detail"],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/workspaces/${workspaceId}/epics/${epicId}/jira`
      );

      return res.data;
    },
  });
}
