import mongoose from "mongoose";

const { Schema } = mongoose;

const PredictionSnapshotSchema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    epicId: {
      type: Schema.Types.ObjectId,
      ref: "Epic",
      required: true,
      index: true,
    },

    key: {
      type: String,
      index: true,
    },

    riskLevel: {
      type: String,
      enum: ["on_track", "at_risk", "off_track"],
      required: true,
    },

    band: {
      type: String,
      enum: ["healthy", "at_risk", "red_zone"],
    },

    probability: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    forecastWindow: {
      type: String,
      default: "2-6_weeks",
    },

    reasons: {
      type: [String],
      default: [],
    },

    signals: {
      type: Schema.Types.Mixed,
      default: null,
    },

    cycleTime: { type: Number },
    prBacklog: { type: Number },
    commitsLast7d: { type: Number },
    deploysLast14d: { type: Number },

    snapshotType: {
      type: String,
      enum: ["workspace_rebuild", "sync", "scheduled", "manual"],
      default: "workspace_rebuild",
    },

    source: {
      type: String,
      enum: ["engine", "manual", "backfill"],
      default: "engine",
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },

    strongSignals: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    weakSignals: {
      type: [Schema.Types.Mixed],
      default: [],
    },

    missingSignals: {
      type: [String],
      default: [],
    },

    genome: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // we explicitly control createdAt
  }
);

// Fast “latest snapshot per epic” queries
PredictionSnapshotSchema.index(
  { workspaceId: 1, epicId: 1, createdAt: -1 },
  { name: "workspace_epic_latest_prediction" }
);

export default mongoose.model("PredictionSnapshot", PredictionSnapshotSchema);
