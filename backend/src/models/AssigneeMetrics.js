// src/models/AssigneeMetrics.js
import mongoose from "mongoose";

const WindowMetricsSchema = new mongoose.Schema(
  {
    from: Date,
    to: Date,

    storiesCompleted: { type: Number, default: 0 },
    bugsCompleted: { type: Number, default: 0 },

    avgStoryCycleTimeDays: { type: Number, default: null },
    avgBugCycleTimeDays: { type: Number, default: null },

    reopenedCount: { type: Number, default: 0 },
    bugReopenCount: { type: Number, default: 0 },

    epicsOwned: { type: Number, default: 0 },
    epicsOnTime: { type: Number, default: 0 },
    epicsLate: { type: Number, default: 0 },
  },
  { _id: false }
);

const AssigneeMetricsSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    // Jira accountId for the user
    accountId: {
      type: String,
      required: true,
      index: true,
    },

    displayName: String,
    email: String,

    window30d: WindowMetricsSchema,
    window90d: WindowMetricsSchema,

    lastComputedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AssigneeMetricsSchema.index({ workspaceId: 1, accountId: 1 }, { unique: true });

const AssigneeMetrics = mongoose.model(
  "AssigneeMetrics",
  AssigneeMetricsSchema
);

export default AssigneeMetrics;
