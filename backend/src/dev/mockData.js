import Epic from "../models/Epic.js";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import mongoose from "mongoose";

const random = (arr) => arr[Math.floor(Math.random() * arr.length)];

const TITLES = [
  "Payment Gateway Rewrite",
  "Mobile App Stabilization",
  "New Dashboard",
  "API Performance Optimization",
  "User Analytics V2",
  "Search Index Revamp",
  "Notifications System",
  "Billing Engine Upgrade",
  "Data Pipeline Fix",
  "AI Suggestions Module",
];

const STATES = ["In Progress", "Planned", "Blocked", "Review", "Testing"];

export async function seedMockData(workspaceId) {
  // Remove old mock data
  await Epic.deleteMany({ workspaceId });
  await PredictionSnapshot.deleteMany({ workspaceId });

  const epics = [];

  // Generate 6–10 epics
  const count = Math.floor(Math.random() * 4) + 6;

  for (let i = 0; i < count; i++) {
    const epic = await Epic.create({
      workspaceId,
      externalId: new mongoose.Types.ObjectId().toString(),
      source: "jira",
      title: random(TITLES),
      state: random(STATES),
      team: "Team A",
      startedAt: new Date(
        Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000
      ),
      targetDelivery: new Date(
        Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000
      ),
    });

    epics.push(epic);
  }

  // Generate prediction snapshots
  for (const epic of epics) {
    const risk = random(["on_track", "at_risk", "off_track"]);
    const probability =
      risk === "on_track"
        ? Math.floor(70 + Math.random() * 30)
        : risk === "at_risk"
        ? Math.floor(40 + Math.random() * 30)
        : Math.floor(15 + Math.random() * 30);

    const reasons = [];

    if (risk !== "on_track") {
      const possibleReasons = [
        "No commits in last 12 days",
        "No staging deployment in 14 days",
        "Review backlog is 3x higher",
        "PR stuck for 5+ days",
        "Cycle time increased significantly",
      ];
      reasons.push(random(possibleReasons));
      reasons.push(random(possibleReasons));
    }

    await PredictionSnapshot.create({
      workspaceId,
      epicId: epic._id,
      riskLevel: risk,
      probability,
      reasons,
      cycles: {},
      cycleTime: Math.floor(Math.random() * 10 + 5),
      prBacklog: Math.floor(Math.random() * 10),
      commitsLast7d: Math.floor(Math.random() * 12),
      deploysLast14d: Math.floor(Math.random() * 6),
      signals: {
        cycleTimeTrend: random(["increasing", "decreasing", "stable"]),
        commitTrend: random(["low", "moderate", "high"]),
      },
    });
  }

  return { epics: epics.length };
}
