// src/models/WeeklyEpicStatus.js
import mongoose from "mongoose";

const WeeklyEpicStatusSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      index: true,
      required: true,
    },
    epicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Epic",
      index: true,
      required: true,
    },

    weekStart: {
      type: Date,
      index: true, // Monday of that week
      required: true,
    },

    leadAnswer: {
      type: String,
      enum: ["on_track", "slip_1_3", "slip_3_plus"],
      required: true,
    },
    reason: {
      type: String,
      default: null,
    },

    // We store a compact snapshot of auto signals for that week
    autoSignalsSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

WeeklyEpicStatusSchema.index({ epicId: 1, weekStart: 1 }, { unique: true });

export default mongoose.model("WeeklyEpicStatus", WeeklyEpicStatusSchema);
