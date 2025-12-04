// src/scripts/backfillEpicOutcomes.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import { backfillEpicOutcomesForWorkspace } from "../services/epicOutcomeService.js";

async function main() {
  console.log("==== Backfilling EpicOutcome from existing epics ====");
  await connectDB();

  const workspaceId = process.env.WORKSPACE_ID;
  if (!workspaceId) {
    throw new Error("WORKSPACE_ID env var is required");
  }

  const result = await backfillEpicOutcomesForWorkspace(workspaceId);
  console.log(
    `Workspace=${workspaceId} → upserted EpicOutcome for ${result.updated} epics`
  );

  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Error in backfill: ", err);
  try {
    await mongoose.connection.close();
  } catch (_) {}
  process.exit(1);
});
