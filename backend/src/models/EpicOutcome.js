import mongoose from "mongoose";

const { Schema } = mongoose;

const EpicOutcomeSchema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      index: true,
      required: true,
    },

    epicId: {
      type: Schema.Types.ObjectId,
      ref: "Epic",
      unique: true,
      required: true,
    },

    key: {
      type: String,
      index: true,
    },

    closedAt: { type: Date, required: true },
    deadline: { type: Date, required: true },

    slipDays: { type: Number, required: true },

    outcomeBand: {
      type: String,
      enum: ["on_time", "slip_1_3", "slip_3_plus"],
      required: true,
    },

    recordedFrom: {
      type: String,
      enum: ["sync", "rebuild", "manual"],
      default: "sync",
    },
  },
  { timestamps: true }
);

export default mongoose.model("EpicOutcome", EpicOutcomeSchema);
