// src/models/EpicWeeklyCheckin.js
import mongoose from "mongoose";

const EpicWeeklyCheckinSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    epicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Epic",
      required: true,
      index: true,
    },
    weekStart: {
      // Monday 00:00 of that week
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["on_track", "slip_1_3", "slip_3_plus"],
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

// one answer per epic per week per workspace
EpicWeeklyCheckinSchema.index(
  { workspaceId: 1, epicId: 1, weekStart: 1 },
  { unique: true }
);

const EpicWeeklyCheckin = mongoose.model(
  "EpicWeeklyCheckin",
  EpicWeeklyCheckinSchema
);
// One weekly check-in per epic per week
EpicWeeklyCheckinSchema.index(
  { workspaceId: 1, epicId: 1, weekStart: 1 },
  { unique: true }
);

// Fast queries: "all check-ins for epic" or "all check-ins this week"
EpicWeeklyCheckinSchema.index({ workspaceId: 1, weekStart: 1 });
EpicWeeklyCheckinSchema.index({ workspaceId: 1, epicId: 1 });
export default EpicWeeklyCheckin;
