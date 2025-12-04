// tests/evaluateEpicSignals.test.js
import { describe, it, expect } from "@jest/globals";
import { evaluateEpicSignals } from "../src/prediction/evaluateEpicSignals.js";

/**
 * These tests are about STRUCTURE + STABILITY.
 * We snapshot the full result so if you change the scoring logic,
 * tests will tell you exactly what changed.
 */
//intentionally changed snapshots
//npm test -- --updateSnapshot

const baseEpic = {
  _id: "epic-1",
  key: "SCRUM-1",
  title: "Search Indexing Fix",
  state: "In Progress",
  statusCategory: "indeterminate",
  isActive: true,
  startedAt: new Date("2025-11-01T00:00:00.000Z"),
  targetDelivery: new Date("2025-11-30T00:00:00.000Z"),
  team: "SCRUM",
};

const makeIssue = (overrides = {}) => ({
  _id: `issue-${Math.random().toString(36).slice(2)}`,
  epicId: "epic-1",
  key: "SCRUM-X",
  title: "Some story",
  status: "In Progress",
  statusCategory: "indeterminate",
  storyPoints: 3,
  createdAt: new Date("2025-11-05T00:00:00.000Z"),
  updatedAt: new Date("2025-11-10T00:00:00.000Z"),
  ...overrides,
});

const makeDailySignal = (overrides = {}) => ({
  epicId: "epic-1",
  workspaceId: "ws-1",
  date: new Date("2025-11-22T00:00:00.000Z"),
  doneIssuesCount: 2,
  openIssuesCount: 3,
  inProgressIssuesCount: 2,
  inReviewIssuesCount: 1,
  newIssuesCreatedToday: 0,
  issuesStuckInReviewGt3d: 0,
  storyPointsTotal: 15,
  storyPointsCompleted: 6,
  daysSinceLastDone: 1,
  velocityLast7d: 6,
  ...overrides,
});

const makeWeeklyCheckin = (overrides = {}) => ({
  epicId: "epic-1",
  workspaceId: "ws-1",
  weekStart: new Date("2025-11-17T00:00:00.000Z"),
  status: "on_track",
  riskNotes: [],
  updatedAt: new Date("2025-11-18T00:00:00.000Z"),
  ...overrides,
});

describe("evaluateEpicSignals", () => {
  it("produces a structured result for a healthy epic", () => {
    const epic = { ...baseEpic };
    const issues = [
      makeIssue({ status: "Done", statusCategory: "done", storyPoints: 3 }),
      makeIssue({ status: "In Progress", storyPoints: 5 }),
      makeIssue({
        status: "In Review",
        statusCategory: "review",
        storyPoints: 7,
      }),
    ];
    const dailySignal = makeDailySignal();
    const weeklyCheckins = [makeWeeklyCheckin()];

    const result = evaluateEpicSignals({
      epic,
      issues,
      dailySignal,
      ownerMetrics: null,
      weeklyCheckins,
      now: new Date("2025-11-22T12:00:00.000Z"),
    });

    // Basic structure guarantees
    expect(result).toBeDefined();
    expect(typeof result.probability).toBe("number");
    expect(typeof result.riskLevel).toBe("string");
    expect(result.riskLevel.length).toBeGreaterThan(0);
    expect(Array.isArray(result.reasons)).toBe(true);

    // signals can be array/object/whatever your engine decides;
    // we only require it to be present, snapshot locks the shape
    expect(result.signals).toBeDefined();

    // Freeze full output for future regressions
    expect(result).toMatchSnapshot();

    // Freeze full output for future regressions
    expect(result).toMatchSnapshot();
  });

  it("produces a result for an epic with no issues (edge case)", () => {
    const epic = { ...baseEpic, title: "Empty Epic" };
    const issues = [];
    const dailySignal = null;
    const weeklyCheckins = [];

    const result = evaluateEpicSignals({
      epic,
      issues,
      dailySignal,
      ownerMetrics: null,
      weeklyCheckins,
      now: new Date("2025-11-22T12:00:00.000Z"),
    });

    expect(result).toBeDefined();
    expect(typeof result.probability).toBe("number");
    expect(Array.isArray(result.reasons)).toBe(true);

    expect(result).toMatchSnapshot();
  });
});
