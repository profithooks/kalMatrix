import mongoose from "mongoose";

const IntegrationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    // jira | azure_boards | github | azure_repos | gitlab | slack | calendar | cicd_azure | cicd_github | cicd_generic
    type: {
      type: String,
      required: true,
    },

    // display / vendor info
    name: { type: String, required: true }, // e.g. "Jira Cloud"
    vendor: { type: String }, // "Atlassian", "Microsoft", "GitHub"
    category: { type: String }, // "Issue Tracker", "Code Host", etc.

    status: {
      type: String,
      enum: ["connected", "pending", "error", "planned"],
      default: "pending",
    },
    email: { type: String },
    // OAuth-ish
    accessToken: { type: String },
    refreshToken: { type: String },
    expiresAt: { type: Date },

    // for webhooks / tenant
    externalWorkspaceId: { type: String },
    baseUrl: { type: String }, // e.g. https://yourcompany.atlassian.net

    scopes: [{ type: String }],

    lastSyncAt: { type: Date },
    lastSyncStatus: { type: String }, // "ok" | "error"
    lastErrorMessage: { type: String },
    // In src/models/Integration.js schema definition
    syncInProgress: {
      type: Boolean,
      default: false,
    },
    healthStatus: {
      type: String,
      enum: ["healthy", "degraded", "broken"],
      default: "healthy",
      index: true,
    },

    lastSuccessAt: {
      type: Date,
    },

    lastErrorAt: {
      type: Date,
    },

    lastErrorCode: {
      type: String,
    },

    consecutiveFailures: {
      type: Number,
      default: 0,
    },

    lastSyncStartedAt: Date,
    lastSyncFinishedAt: Date,
    lastSyncStatus: {
      type: String,
      enum: ["idle", "running", "success", "error"],
      default: "idle",
    },
    lastErrorMessage: {
      type: String,
    },

    meta: { type: Object }, // flexible, per-provider extras
  },
  { timestamps: true }
);

IntegrationSchema.index({ workspaceId: 1, type: 1 }, { unique: true });

export default mongoose.model("Integration", IntegrationSchema);
