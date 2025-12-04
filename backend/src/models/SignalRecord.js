import mongoose from "mongoose";

const SignalRecordSchema = new mongoose.Schema(
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

    type: {
      type: String,
      required: true,
      // examples:
      // "no_commits", "no_deployments", "review_stuck", "high_cycle_time",
      // "pr_open_too_long", "review_backlog_3x"
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    message: { type: String },
    rawData: { type: Object }, // full event from Git/Azure/Jira

    detectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("SignalRecord", SignalRecordSchema);
