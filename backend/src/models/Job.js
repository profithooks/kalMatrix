// src/models/Job.js
import mongoose from "mongoose";

const JobSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["prediction_rebuild"], // extend later
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
      index: true,
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    startedAt: {
      type: Date,
    },

    finishedAt: {
      type: Date,
    },

    durationMs: {
      type: Number,
    },

    error: {
      message: String,
      stack: String,
    },
  },
  { timestamps: true }
);

// Helpful indexes
JobSchema.index({ workspaceId: 1, type: 1, createdAt: -1 });
JobSchema.index({ status: 1, createdAt: 1 });


export default mongoose.model("Job", JobSchema);
