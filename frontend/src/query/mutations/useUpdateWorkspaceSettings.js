// src/query/mutations/useUpdateWorkspaceSettings.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

export function useUpdateWorkspaceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      // Expect backend route: PATCH /api/workspaces/me
      const res = await apiClient.patch("/api/workspaces/me", payload);
      return res.data;
    },
    onSuccess: (data) => {
      // Keep cache in sync
      queryClient.setQueryData(["workspace", "settings"], data);
    },
  });
}
