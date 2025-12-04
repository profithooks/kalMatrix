export const mockTeams = [
  {
    id: "team-1",
    name: "Platform",
    members: ["Arjun", "Ravi", "Meera"],
    teamRisk: 0.62,
    activeEpics: [
      { id: 1, name: "Payments Rewrite", risk: 0.68 },
      { id: 3, name: "Notification Engine", risk: 0.54 },
    ],
    confidence: [0.6, 0.55, 0.72, 0.68],
  },

  {
    id: "team-2",
    name: "Mobile",
    members: ["Nikhil", "Sara"],
    teamRisk: 0.28,
    activeEpics: [{ id: 2, name: "Mobile App Refresh", risk: 0.22 }],
    confidence: [0.8, 0.78, 0.85, 0.9],
  },

  {
    id: "team-3",
    name: "Infra",
    members: ["Vishal", "Omkar", "Tanvi", "Jay"],
    teamRisk: 0.51,
    activeEpics: [{ id: 4, name: "Staging Overhaul", risk: 0.49 }],
    confidence: [0.4, 0.45, 0.42, 0.38],
  },
];
