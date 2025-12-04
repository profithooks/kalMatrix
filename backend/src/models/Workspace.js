import mongoose from "mongoose";

const WorkspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    workingDays: {
      type: [String],
      default: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    },
    horizon: { type: String, default: "2-6" },

    // NEW: when predictions were last rebuilt for this workspace
    lastPredictionRebuildAt: { type: Date, default: null },
    predictionWindowWeeks: {
      type: Number,
      default: 6, // allow 1–6
      min: 1,
      max: 6,
    },
  },

  { timestamps: true }
);

export default mongoose.model("Workspace", WorkspaceSchema);
