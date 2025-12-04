// tests/predictionService.test.js
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import Workspace from "../src/models/Workspace.js";
import Epic from "../src/models/Epic.js";
import Issue from "../src/models/Issue.js";
import DailyEpicSignal from "../src/models/DailyEpicSignal.js";
import PredictionSnapshot from "../src/models/PredictionSnapshot.js";
import { rebuildPredictionsForWorkspace } from "../src/services/predictionService.js";

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  await mongoose.connect(uri, {
    dbName: "hamza-test",
  });
});

afterEach(async () => {
  // wipe between tests
  await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongod.stop();
});

describe("predictionService.rebuildPredictionsForWorkspace", () => {
  it("generates daily signals and prediction snapshots for a workspace", async () => {
    // 1) Seed minimal workspace
    const ownerId = new mongoose.Types.ObjectId();
    const workspace = await Workspace.create({
      name: "Test Workspace",
      owner: ownerId,
      slug: "test-ws",
    });

    // 2) Seed one epic
    const epic = await Epic.create({
      workspaceId: workspace._id,
      externalId: "10001",
      key: "SCRUM-1",
      title: "End-to-end test epic",
      state: "In Progress",
      statusCategory: "indeterminate",
      isActive: true,
      team: "SCRUM",
      startedAt: new Date("2025-11-01T00:00:00.000Z"),
      targetDelivery: new Date("2025-11-30T00:00:00.000Z"),
      url: "https://example.atlassian.net/browse/SCRUM-1",
      source: "jira",
    });

    // 3) Seed a few issues under that epic
    await Issue.create([
      {
        workspaceId: workspace._id,
        epicId: epic._id,
        externalId: "20001",
        key: "SCRUM-2",
        title: "Done story",
        status: "Done",
        statusCategory: "done",
        storyPoints: 3,
        createdAt: new Date("2025-11-05T00:00:00.000Z"),
        updatedAt: new Date("2025-11-10T00:00:00.000Z"),
      },
      {
        workspaceId: workspace._id,
        epicId: epic._id,
        externalId: "20002",
        key: "SCRUM-3",
        title: "In progress story",
        status: "In Progress",
        statusCategory: "indeterminate",
        storyPoints: 5,
        createdAt: new Date("2025-11-12T00:00:00.000Z"),
        updatedAt: new Date("2025-11-20T00:00:00.000Z"),
      },
      {
        workspaceId: workspace._id,
        epicId: epic._id,
        externalId: "20003",
        key: "SCRUM-4",
        title: "Review story",
        status: "In Review",
        statusCategory: "review",
        storyPoints: 8,
        createdAt: new Date("2025-11-15T00:00:00.000Z"),
        updatedAt: new Date("2025-11-21T00:00:00.000Z"),
      },
    ]);

    // 4) Run the whole prediction pipeline WITHOUT Jira sync
    const result = await rebuildPredictionsForWorkspace(workspace._id, {
      skipSync: true,
    });

    // basic sanity on service return
    expect(result).toBeDefined();
    // We don't over-constrain here; structure may evolve.

    // 5) Check DB side-effects: signals + snapshots exist
    const signals = await DailyEpicSignal.find({ workspaceId: workspace._id });
    const snapshots = await PredictionSnapshot.find({
      workspaceId: workspace._id,
      epicId: epic._id,
    });

    expect(signals.length).toBeGreaterThan(0);
    expect(snapshots.length).toBeGreaterThan(0);

    const signal = signals[0];
    expect(signal.doneIssuesCount).toBeGreaterThanOrEqual(1);
    expect(signal.storyPointsTotal).toBeGreaterThan(0);

    const snap = snapshots[0];
    expect(typeof snap.probability).toBe("number");
    expect(Array.isArray(snap.reasons)).toBe(true);
  });
});
