// models/Issue.js
import mongoose from "mongoose";

const StatusHistorySchema = new mongoose.Schema(
  {
    status: String,
    category: String, // "todo" | "in_progress" | "review" | "done"
    from: Date,
    to: Date,
  },
  { _id: false }
);

const CommentSchema = new mongoose.Schema(
  {
    externalId: String, // Jira comment id
    author: {
      accountId: String,
      displayName: String,
      email: String,
    },
    body: String,
    createdAt: Date,
    updatedAt: Date,
  },
  { _id: false }
);
const AssigneeSchema = new mongoose.Schema(
  {
    accountId: String,
    displayName: String,
    email: String,
  },
  { _id: false }
);
const IssueSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    epicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Epic",
      index: true,
    },

    externalId: { type: String, index: true }, // Jira internal id
    assignee: AssigneeSchema, // primary owner
    assignees: { type: [AssigneeSchema], default: [] }, // keep array for future

    key: { type: String, index: true }, // "SCRUM-23"
    source: { type: String, default: "jira" },
    comments: [
      {
        jiraId: String,
        authorName: String,
        authorKey: String,
        body: String,
        createdAt: Date,
      },
    ],

    type: String, // "Story" | "Task" | "Bug" | "Sub-task"
    parentKey: String, // for subtasks

    title: String,
    description: String,
    url: String,

    status: String,
    statusCategory: String,

    assignees: [
      {
        accountId: String,
        displayName: String,
        email: String,
      },
    ],

    storyPoints: Number,
    priority: String,

    statusHistory: [StatusHistorySchema],
    comments: [CommentSchema],

    createdAtJira: Date,
    updatedAtJira: Date,
    resolvedAt: Date,
  },

  { timestamps: true }
);
// Helpful indexes for epic + workspace lookups
// Fast mapping from workspace+external id to issue
IssueSchema.index({ workspaceId: 1, externalId: 1 }, { unique: true });

// Typical filters used by risk engine: issues by epic
IssueSchema.index({ workspaceId: 1, epicId: 1 });

// If you sort/filter by statusCategory a lot
IssueSchema.index({ workspaceId: 1, statusCategory: 1 });

export default mongoose.model("Issue", IssueSchema);
