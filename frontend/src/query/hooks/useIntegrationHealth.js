// src/query/hooks/useIntegrationHealth.js
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

export function useIntegrationHealth(integrationId) {
  return useQuery({
    queryKey: ["integration-health", integrationId],
    enabled: !!integrationId,
    queryFn: async () => {
      const res = await apiClient.get(
        `/integrations/${integrationId}/health`
      );
      // Expecting { ok: true, data: { ...health } }
      if (!res.data?.ok) {
        throw new Error(res.data?.error || "Failed to load integration health");
      }
      return res.data.data;
    },
  });
}
