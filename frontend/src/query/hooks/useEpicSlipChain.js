// src/query/hooks/useEpicSlipChain.js
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

export function useEpicSlipChain(epicId) {
  const workspaceId = useAuthStore((s) => s.workspaceId);

  return useQuery({
    enabled: !!epicId && !!workspaceId,
    queryKey: ["epic", epicId, "slip-chain", workspaceId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/workspaces/${workspaceId}/epics/${epicId}/slip-chain`
      );
      return res.data?.data || null;
    },
  });
}
