// src/prediction/signalDefinitions.js

// type: "negative" | "positive"
// category: "planning" | "execution" | "bugs" | "owner" | "checkin"
// weight: effect on risk score in [-20, +20]

const SIGNAL_DEFINITIONS = {
  // --- PLANNING / STRUCTURE ---

  NO_STORIES_LINKED: {
    id: "NO_STORIES_LINKED",
    type: "negative",
    category: "planning",
    weight: 15,
    message: "Epic has no linked stories.",
  },

  NO_ESTIMATES_DEFINED: {
    id: "NO_ESTIMATES_DEFINED",
    type: "negative",
    category: "planning",
    weight: 8,
    message: "None of the stories under this epic have estimates.",
  },

  EPIC_NO_TARGET_DATE: {
    id: "EPIC_NO_TARGET_DATE",
    type: "negative",
    category: "planning",
    weight: 10,
    message: "Epic has no target delivery date.",
  },

  EPIC_NO_OWNER: {
    id: "EPIC_NO_OWNER",
    type: "negative",
    category: "planning",
    weight: 10,
    message: "Epic has no clear owner assigned.",
  },

  // --- EXECUTION / MOVEMENT ---

  NO_MOVEMENT_7_DAYS: {
    id: "NO_MOVEMENT_7_DAYS",
    type: "negative",
    category: "execution",
    weight: 10,
    message: "No story or epic movement in the last 7 days.",
  },

  NO_MOVEMENT_14_DAYS: {
    id: "NO_MOVEMENT_14_DAYS",
    type: "negative",
    category: "execution",
    weight: 18,
    message: "No story or epic movement in the last 14 days.",
  },

  NEAR_DUE_LOW_COMPLETION: {
    id: "NEAR_DUE_LOW_COMPLETION",
    type: "negative",
    category: "execution",
    weight: 12,
    message:
      "Epic is near its target date but a low percentage of stories are completed.",
  },

  PAST_DUE_NOT_COMPLETED: {
    id: "PAST_DUE_NOT_COMPLETED",
    type: "negative",
    category: "execution",
    weight: 20,
    message: "Epic is past its target date and not completed.",
  },

  HIGH_WIP_IN_PROGRESS: {
    id: "HIGH_WIP_IN_PROGRESS",
    type: "negative",
    category: "execution",
    weight: 8,
    message: "Many stories are in progress at the same time (high WIP).",
  },

  LONG_RUNNING_STORIES: {
    id: "LONG_RUNNING_STORIES",
    type: "negative",
    category: "execution",
    weight: 8,
    message: "Some stories have been in progress for too long.",
  },

  // --- BUGS / QUALITY ---

  HIGH_BUG_COUNT: {
    id: "HIGH_BUG_COUNT",
    type: "negative",
    category: "bugs",
    weight: 10,
    message: "High number of bugs linked to this epic.",
  },

  OPEN_CRITICAL_BUGS: {
    id: "OPEN_CRITICAL_BUGS",
    type: "negative",
    category: "bugs",
    weight: 15,
    message: "Critical bugs for this epic are still open.",
  },

  // --- OWNER / ASSIGNEE ---

  OWNER_LOW_VELOCITY: {
    id: "OWNER_LOW_VELOCITY",
    type: "negative",
    category: "owner",
    weight: 10,
    message:
      "Epic owner has low throughput in the recent period compared to the team.",
  },

  OWNER_HIGH_REOPEN_RATE: {
    id: "OWNER_HIGH_REOPEN_RATE",
    type: "negative",
    category: "owner",
    weight: 12,
    message: "Work owned by this epic owner is frequently reopened.",
  },

  OWNER_STRONG_VELOCITY: {
    id: "OWNER_STRONG_VELOCITY",
    type: "positive",
    category: "owner",
    weight: -8,
    message: "Epic owner has strong throughput in the recent period.",
  },

  OWNER_HISTORY_ON_TIME: {
    id: "OWNER_HISTORY_ON_TIME",
    type: "positive",
    category: "owner",
    weight: -10,
    message: "Most previous epics owned by this person were delivered on time.",
  },

  OWNER_NO_ACTIVITY_7_DAYS: {
    id: "OWNER_NO_ACTIVITY_7_DAYS",
    type: "negative",
    category: "owner",
    weight: 12,
    message: "Epic owner has no visible activity in the last 7 days.",
  },

  // --- CHECKIN / COMMUNICATION ---

  NO_WEEKLY_CHECKIN_2_WEEKS: {
    id: "NO_WEEKLY_CHECKIN_2_WEEKS",
    type: "negative",
    category: "checkin",
    weight: 10,
    message: "No weekly check-in has been submitted for this epic in 2 weeks.",
  },

  CHECKIN_GREEN_DATA_RED: {
    id: "CHECKIN_GREEN_DATA_RED",
    type: "negative",
    category: "checkin",
    weight: 8,
    message:
      "Weekly check-in reports 'On track', but data signals show slowing or stalled progress.",
  },

  // --- POSITIVE EXECUTION SIGNALS ---

  GOOD_PROGRESS_STEADY: {
    id: "GOOD_PROGRESS_STEADY",
    type: "positive",
    category: "execution",
    weight: -10,
    message: "Stories are steadily moving to Done with good completion ratio.",
  },

  RECENT_MOVEMENT: {
    id: "RECENT_MOVEMENT",
    type: "positive",
    category: "execution",
    weight: -5,
    message: "Stories or the epic itself have moved in the last few days.",
  },

  ON_TRACK_VS_TARGET: {
    id: "ON_TRACK_VS_TARGET",
    type: "positive",
    category: "execution",
    weight: -10,
    message:
      "Progress and remaining time are aligned; the epic looks on track versus its target date.",
  },
};

export default SIGNAL_DEFINITIONS;
