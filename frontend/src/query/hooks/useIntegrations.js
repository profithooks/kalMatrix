import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

function mapApiToUi(data) {
  const list = Array.isArray(data) ? data : [];

  return list.map((item) => {
    const status = (item.status || "connected").toLowerCase();

    return {
      id: item.id || item._id,
      name: item.name || item.provider || item.type || "Unknown",
      type: item.type || "custom",
      provider: item.provider || item.type || "Custom",
      category: item.category || "other",
      status, // "connected" | "disconnected" | "error" etc.
      baseUrl: item.baseUrl || "",
      lastSyncAt: item.lastSyncAt || item.meta?.lastSyncAt || null,
      scopes: item.scopes || [],
      meta: item.meta || {},
    };
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await apiClient.get("/integrations");
      return mapApiToUi(res.data);
    },
  });
}
