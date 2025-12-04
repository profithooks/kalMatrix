import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

export function useConnectJira() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post("/integrations/jira/connect", payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}
