// src/query/mutations/useJiraOAuthInit.js
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";

export function useJiraOAuthInit() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.get("/integrations/jira/oauth/initiate");
      return res.data; // { authorizeUrl }
    },
  });
}
