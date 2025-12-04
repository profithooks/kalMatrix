// src/query/hooks/useWorkspaceSettings.js
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

export function useWorkspaceSettings() {
  return useQuery({
    queryKey: ["workspace", "settings"],
    queryFn: async () => {
      const res = await apiClient.get("/api/workspaces/me");
      // Controller already returns normalized shape
      return res.data;
    },
  });
}
