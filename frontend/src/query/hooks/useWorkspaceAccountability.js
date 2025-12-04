// src/query/hooks/useWorkspaceAccountability.js
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

/**
 * Weekly Accountability summary for current workspace.
 *
 * Backend route:
 *   GET /api/workspaces/:workspaceId/weekly-checkins/accountability
 *
 * Expected shape:
 *   { ok: true, data: { summary: {...}, users: [...] } }
 *   or
 *   { summary: {...}, users: [...] }
 */
export function useWorkspaceAccountability() {
  const { user } = useAuthStore();

  const workspaceId =
    user?.workspace?.id || user?.workspaceId || user?.workspace?._id || null;

  return useQuery({
    queryKey: ["workspace-accountability", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      if (!workspaceId) {
        throw new Error("No workspaceId available for accountability");
      }

      const res = await apiClient.get(
        `/api/workspaces/${workspaceId}/weekly-checkins/accountability`
      );

      const payload = res.data;

      if (payload && typeof payload === "object") {
        if (payload.ok === false) {
          throw new Error(
            payload.error || "Failed to load accountability summary"
          );
        }
        if (payload.data) {
          return payload.data;
        }
      }

      return payload;
    },
  });
}
