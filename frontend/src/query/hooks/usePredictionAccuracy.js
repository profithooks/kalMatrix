import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

export function usePredictionAccuracy() {
  const user = useAuthStore((s) => s.user);
  const hasWorkspace = !!(user?.workspaceId || user?.workspace?.id);

  return useQuery({
    enabled: hasWorkspace,
    queryKey: ["predictionAccuracy"],
    queryFn: async () => {
      const res = await apiClient.get("/api/predictions/accuracy");
      // backend already takes workspaceId from auth token
      return res.data?.data || res.data;
    },
    staleTime: 60_000, // 1 min
  });
}
