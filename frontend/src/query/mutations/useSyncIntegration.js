// src/query/mutations/useSyncIntegration.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

export function useSyncIntegration() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (integrationId) => {
      const res = await apiClient.post(`/integrations/${integrationId}/sync`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      qc.invalidateQueries({ queryKey: ["epics", "risk"] });
      qc.invalidateQueries({ queryKey: ["predictionAccuracy"] });
    },
  });
}
