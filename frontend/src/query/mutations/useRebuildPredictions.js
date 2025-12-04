import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

export function useRebuildPredictions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/api/jobs/predictions/rebuild");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["epics", "risk"] });
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}
