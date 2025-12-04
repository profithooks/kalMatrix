import axios from "axios";
import Integration from "../models/Integration.js";

/**
 * Sync GitHub repo signals for a workspace.
 * Skeleton: returns aggregated metrics from mocked PRs/commits.
 */
export const syncGithubReposForWorkspace = async (workspaceId) => {
  // 1) Find GitHub integration
  const integration = await Integration.findOne({
    workspaceId,
    type: "github",
    status: "connected",
  });

  if (!integration) {
    throw new Error("No connected GitHub integration for this workspace.");
  }

  const baseUrl = (integration.baseUrl || "https://api.github.com").replace(
    /\/$/,
    ""
  );
  const token = integration.accessToken || "mock-token";

  // 2) In real life, we’d do:
  //
  // const res = await axios.get(
  //   `${baseUrl}/repos/${owner}/${repo}/pulls`,
  //   {
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //       Accept: "application/vnd.github+json",
  //     },
  //   }
  // );
  //
  // const prs = res.data;
  //
  // plus commits, branches, etc.
  //
  // For now, we fake PRs + commits:

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const mockPRs = [
    {
      id: 1,
      title: "EPIC-123: Implement payment retries",
      created_at: new Date(now - 7 * oneDay),
      updated_at: new Date(now - 2 * oneDay),
      merged_at: null,
      state: "open",
    },
    {
      id: 2,
      title: "EPIC-456: Add dashboard filters",
      created_at: new Date(now - 3 * oneDay),
      updated_at: new Date(now - 1 * oneDay),
      merged_at: new Date(now - oneDay),
      state: "closed",
    },
  ];

  const mockCommitsLast7d = 24; // pretend we computed this from /commits

  // 3) Aggregate simple metrics
  const totalPRs = mockPRs.length;
  const openPRs = mockPRs.filter((p) => p.state === "open").length;
  const idleOpenPRs = mockPRs.filter((p) => {
    if (p.state !== "open") return false;
    const lastUpdate = new Date(p.updated_at).getTime();
    return now - lastUpdate > 3 * oneDay; // open & idle > 3 days
  }).length;

  return {
    totalPRs,
    openPRs,
    idleOpenPRs,
    commitsLast7d: mockCommitsLast7d,
    baseUrl,
  };
};
