import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

export function useSubmitCheckin() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const workspaceId = user?.workspaceId;

  return useMutation({
    mutationFn: async ({ epicId, status, comment }) => {
      const res = await apiClient.post(
        `/api/workspaces/${workspaceId}/weekly-checkins`,
        { epicId, status, comment }
      );
      return res.data;
    },
    onSuccess: () => {
      // refresh pending check-ins
      qc.invalidateQueries({
        queryKey: ["weekly-checkins", "pending", workspaceId],
      });

      // refresh delivery radar / epics risk list
      qc.invalidateQueries({
        queryKey: ["epics", "risk", workspaceId],
      });
    },
  });
}
