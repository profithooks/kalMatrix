export const epicRiskData = [
  {
    id: 1,
    epic: "Payments Rewrite",
    risk: 0.68,
    window: "3–5 weeks",
    signals: [
      "No staging deployment in 14 days",
      "Cycle time up 42%",
      "3 PRs idle for 5+ days",
      "Critical story stuck for 9 days",
    ],
  },
  {
    id: 2,
    epic: "Mobile App Refresh",
    risk: 0.22,
    window: "2–3 weeks",
    signals: ["Healthy development pattern"],
  },
  {
    id: 3,
    epic: "Notification Engine",
    risk: 0.54,
    window: "4–6 weeks",
    signals: ["Test coverage dropped 16%", "Review backlog growing"],
  },
];
