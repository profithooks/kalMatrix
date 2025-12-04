// src/prediction/evaluateEpicSignals.test.js
import { describe, test, expect } from "@jest/globals";
import { evaluateEpicSignals } from "./evaluateEpicSignals.js";

describe("evaluateEpicSignals", () => {
  const makeIssue = (overrides = {}) => ({
    key: "ISSUE-1",
    statusCategory: "to_do",
    type: "Story",
    storyPoints: null,
    priority: "Medium",
    createdAtJira: null,
    ...overrides,
  });

  test("returns low risk, completed window for done epic delivered before target", () => {
    const now = new Date("2025-01-15T00:00:00Z");
    const epic = {
      _id: "epic-1",
      title: "Completed Epic",
      statusCategory: "done",
      state: "Done",
      isActive: false,
      targetDelivery: new Date("2025-01-20T00:00:00Z"),
      closedAt: new Date("2025-01-10T00:00:00Z"),
      updatedAt: new Date("2025-01-10T00:00:00Z"),
      assignees: [],
      statusHistory: [],
    };

    const issues = [
      makeIssue({
        statusCategory: "done",
      }),
    ];

    const result = evaluateEpicSignals({
      epic,
      issues,
      dailySignal: null,
      ownerMetrics: null,
      weeklyCheckins: [],
      now,
    });

    expect(result).toBeDefined();
    expect(result.forecastWindow).toBe("completed");
    expect(result.riskLevel).toBe("on_track");
    expect(result.probability).toBe(10);
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test("flags high risk when epic is past due, has no stories, and no activity/check-ins", () => {
    const now = new Date("2025-01-20T00:00:00Z");

    const epic = {
      _id: "epic-2",
      title: "Risky Epic",
      statusCategory: "in_progress",
      state: "In Progress",
      isActive: true,
      targetDelivery: new Date("2025-01-10T00:00:00Z"), // past due
      updatedAt: new Date("2024-12-31T00:00:00Z"), // no recent movement
      assignees: [],
      statusHistory: [],
    };

    const issues = []; // NO_STORIES_LINKED

    const result = evaluateEpicSignals({
      epic,
      issues,
      dailySignal: null,
      ownerMetrics: null,
      weeklyCheckins: [], // NO_WEEKLY_CHECKIN_2_WEEKS
      now,
    });

    expect(result).toBeDefined();
    expect(result.forecastWindow).toBe("0-2_weeks");

    expect(result.riskLevel).toBe("off_track");
    expect(result.probability).toBeGreaterThanOrEqual(70);
    expect(result.probability).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test("rewards good progress and near-on-track timing with positive signals", () => {
    const now = new Date("2025-01-10T00:00:00Z");

    const epic = {
      _id: "epic-3",
      title: "Healthy Epic",
      statusCategory: "in_progress",
      state: "In Progress",
      isActive: true,
      targetDelivery: new Date("2025-01-20T00:00:00Z"), // still ahead
      updatedAt: now,
      assignees: [{ id: "owner-1" }],
      statusHistory: [],
    };

    // 8 done, 2 in progress => good completion ratio
    const issues = [
      ...Array.from({ length: 8 }).map((_, i) =>
        makeIssue({
          key: `ISSUE-DONE-${i}`,
          statusCategory: "done",
          storyPoints: 3,
        })
      ),
      ...Array.from({ length: 2 }).map((_, i) =>
        makeIssue({
          key: `ISSUE-INPROG-${i}`,
          statusCategory: "in_progress",
          storyPoints: 3,
          createdAtJira: new Date("2024-12-30T00:00:00Z"),
        })
      ),
    ];

    const weeklyCheckins = [
      {
        weekStart: new Date("2025-01-03T00:00:00Z"),
        status: "on_track",
        comment: "Everything on track",
      },
    ];

    const result = evaluateEpicSignals({
      epic,
      issues,
      dailySignal: null,
      ownerMetrics: null,
      weeklyCheckins,
      now,
    });

    expect(result).toBeDefined();
    expect(result.forecastWindow).toBe("0-2_weeks");

    // Engine may still treat this as slightly at risk depending on thresholds.
    expect(["on_track", "at_risk"]).toContain(result.riskLevel);

    // But risk should not be in the "critical" band.
    expect(result.probability).toBeGreaterThanOrEqual(0);
    expect(result.probability).toBeLessThan(70);

    expect(Array.isArray(result.reasons)).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
    const reasonsText = result.reasons.join(" ");
    expect(reasonsText).toMatch(/Stories are steadily moving/i);
  });
});
