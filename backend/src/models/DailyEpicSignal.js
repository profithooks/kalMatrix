// models/DailyEpicSignal.js
import mongoose from "mongoose";

const DailyEpicSignalSchema = new mongoose.Schema(
  {
    epicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Epic",
      index: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      index: true,
    },

    date: { type: Date, index: true }, // day bucket, e.g., 2025-11-21

    // Aggregated metrics for that day
    openIssuesCount: Number,
    inProgressIssuesCount: Number,
    inReviewIssuesCount: Number,
    doneIssuesCount: Number,

    storyPointsTotal: Number,
    storyPointsCompleted: Number,
    storyPointsAddedToday: Number,
    storyPointsRemovedToday: Number,

    avgCycleTimeLast7d: Number, // in hours/days
    newIssuesCreatedToday: Number,
    issuesMovedToReviewToday: Number,
    issuesStuckInReviewGt3d: Number,

    lastDeployAt: Date, // from CI/GitHub later
    commitsLast7d: Number,
    prsOpen: Number,
    prsStaleGt3d: Number,
  },
  { timestamps: true }
);

DailyEpicSignalSchema.index({ workspaceId: 1, epicId: 1, date: 1 });
// For dashboards by day
DailyEpicSignalSchema.index({ workspaceId: 1, date: 1 });

export default mongoose.model("DailyEpicSignal", DailyEpicSignalSchema);
