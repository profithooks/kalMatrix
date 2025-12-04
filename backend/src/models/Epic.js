// models/Epic.js
import mongoose from "mongoose";

const StatusHistorySchema = new mongoose.Schema(
  {
    status: String, // "To Do", "In Progress", "In Review", "Done"
    category: String, // "todo" | "in_progress" | "done" (normalized)
    from: Date,
    to: Date, // null if current
  },
  { _id: false }
);

const EpicSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    // Jira IDs
    externalId: { type: String, index: true }, // Jira epic ID (issue id)
    key: { type: String, index: true }, // "SCRUM-12"
    source: { type: String, default: "jira" }, // "jira" | "azure" | "github"

    title: String,
    description: String,
    url: String,
    reporter: {
      accountId: String,
      displayName: String,
      email: String,
    },
    createdAtJira: Date,

    state: String, // "To Do" / "In Progress" / "Done" (current Jira status)
    statusCategory: String, // "todo" | "in_progress" | "done"

    assignees: [
      {
        accountId: String,
        displayName: String,
        email: String,
      },
    ],

    storyPointsPlanned: Number,
    storyPointsCompleted: Number,
    storyPointsAddedAfterStart: Number, // scope creep

    statusHistory: [StatusHistorySchema],

    startedAt: Date, // when epic moved from todo→in_progress
    targetDelivery: Date,
    closedAt: Date, // when epic moved to done
    deadline: Date, // product/PM specified

    tags: [String],
    team: String,

    // Meta flags
    isActive: { type: Boolean, default: true }, // false when closed
  },
  { timestamps: true }
);

// After EpicSchema definition
EpicSchema.index({ workspaceId: 1, updatedAt: -1 });
EpicSchema.index({ workspaceId: 1, statusCategory: 1 });
// Optional: if you often query active items only
EpicSchema.index({ workspaceId: 1, isActive: 1, updatedAt: -1 });

export default mongoose.model("Epic", EpicSchema);
