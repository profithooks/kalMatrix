// src/query/hooks/useIntegration.js
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

export function useIntegration(integrationId) {
  return useQuery({
    queryKey: ["integration", integrationId],
    enabled: !!integrationId,
    queryFn: async () => {
      const res = await apiClient.get(`/integrations/${integrationId}`);
      const payload = res.data;

      // Support both { ok, data } and direct object
      if (payload && typeof payload === "object" && "data" in payload) {
        return payload.data;
      }
      return payload;
    },
  });
}
