import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

export function useEpicSignals(epicId) {
  const user = useAuthStore((s) => s.user);
  const workspaceId = user?.workspaceId || user?.workspace?.id;

  return useQuery({
    enabled: !!workspaceId && !!epicId,
    queryKey: ["epic", workspaceId, epicId, "signals"],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/predictions/epic/${epicId}/signals`
      );
      return res.data;
    },
  });
}
