// src/query/hooks/useWeeklyCheckins.js
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

// 🔹 Existing epic-level hooks (keep as-is)
export function useWeeklyCheckins(workspaceId, epicId) {
  return useQuery({
    enabled: !!workspaceId && !!epicId,
    queryKey: ["epic", workspaceId, epicId, "weekly-checkins"],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/workspaces/${workspaceId}/epics/${epicId}/checkins/weekly`
      );
      return res.data?.items || res.data?.checkins || [];
    },
  });
}

export function useEpicOutcome(workspaceId, epicId) {
  return useQuery({
    enabled: !!workspaceId && !!epicId,
    queryKey: ["epic", workspaceId, epicId, "outcome"],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/workspaces/${workspaceId}/epics/${epicId}/outcome`
      );
      return res.data?.outcome || null;
    },
  });
}

export function useSubmitWeeklyCheckin(workspaceId, epicId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadAnswer, reason }) => {
      const res = await apiClient.post(
        `/api/workspaces/${workspaceId}/epics/${epicId}/checkins/weekly`,
        { leadAnswer, reason }
      );
      return res.data?.checkin || res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["epic", workspaceId, epicId, "weekly-checkins"],
      });
      qc.invalidateQueries({
        queryKey: ["epic", workspaceId, epicId, "outcome"],
      });
      qc.invalidateQueries({ queryKey: ["epics", "risk"] });
    },
  });
}

// 🔹 NEW: workspace-level weekly check-ins for the dashboard page

// GET /api/workspaces/:workspaceId/weekly-checkins/pending
export function usePendingWeeklyCheckins() {
  const { user } = useAuthStore();
  const workspaceId = user?.workspaceId;

  return useQuery({
    enabled: !!workspaceId,
    queryKey: ["weekly-checkins", workspaceId, "pending"],
    queryFn: async () => {
      const res = await apiClient.get(
        `/api/workspaces/${workspaceId}/weekly-checkins/pending`
      );
      return res.data; // { ok, weekStart, epics: [...] }
    },
  });
}

// POST /api/workspaces/:workspaceId/weekly-checkins
export function useSubmitWorkspaceWeeklyCheckin() {
  const { user } = useAuthStore();
  const workspaceId = user?.workspaceId;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ epicId, status, reason }) => {
      const res = await apiClient.post(
        `/api/workspaces/${workspaceId}/weekly-checkins`,
        { epicId, status, reason }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["weekly-checkins", workspaceId, "pending"],
      });
      qc.invalidateQueries({ queryKey: ["epics", "risk"] });
    },
  });
}
