// src/scripts/generateEpicPredictions.js
import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import { connectDB } from "../config/db.js";
import Epic from "../models/Epic.js";
import Issue from "../models/Issue.js";
import DailyEpicSignal from "../models/DailyEpicSignal.js";
import EpicWeeklyCheckin from "../models/EpicWeeklyCheckin.js";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import { evaluateEpicSignals } from "../prediction/evaluateEpicSignals.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_PATH = path.join(__dirname, "..", "data", "epic_predictions.json");

async function main() {
  console.log("==== Generating epic_predictions.json from live data ====");

  // 1) Connect to Mongo
  await connectDB();

  // 2) Pull all epics (later you can filter by workspaceId if needed)
  const epics = await Epic.find({}).lean();
  console.log(`Found ${epics.length} epics in DB`);

  const predictions = [];

  for (const epic of epics) {
    try {
      const epicId = epic._id;
      const workspaceId = epic.workspaceId;

      if (!workspaceId) {
        console.warn(
          `Skipping epic ${epic.key || epicId} because workspaceId is missing`
        );
        continue;
      }

      // Issues under this epic
      const issues = await Issue.find({ epicId, workspaceId }).lean();

      // Latest daily signal
      const dailySignal = await DailyEpicSignal.findOne({
        epicId,
        workspaceId,
      })
        .sort({ date: -1, createdAt: -1 })
        .lean();

      // Latest weekly check-ins (most recent first)
      const weeklyCheckins = await EpicWeeklyCheckin.find({
        epicId,
        workspaceId,
      })
        .sort({ weekStart: -1, createdAt: -1 })
        .limit(10)
        .lean();

      // Owner metrics not wired yet
      const ownerMetrics = null;

      const evalResult = evaluateEpicSignals({
        epic,
        issues,
        dailySignal,
        ownerMetrics,
        weeklyCheckins,
      });

      const {
        riskLevel, // "on_track" | "at_risk" | "off_track"
        probability, // 0–100
        forecastWindow, // "2-6_weeks" | "completed"
        reasons,
        signals,
      } = evalResult;

      // 3) Push into JSON payload for CLI evaluation script
      predictions.push({
        key: epic.key,
        epicId: String(epicId),
        workspaceId: workspaceId ? String(workspaceId) : null,
        riskLevel,
        probability,
        forecastWindow,
        reasons,
      });

      // 4) Also persist a PredictionSnapshot document (moat: historical predictions)
      try {
        await PredictionSnapshot.create({
          workspaceId,
          epicId,
          riskLevel,
          probability,
          forecastWindow,
          reasons,
          signals,
        });
      } catch (snapshotErr) {
        console.error(
          `Error saving PredictionSnapshot for epic ${epic.key || epicId}:`,
          snapshotErr.message
        );
      }
    } catch (err) {
      console.error(
        `Error generating prediction for epic ${epic.key || epic._id}:`,
        err.message
      );
    }
  }

  // 5) Ensure data dir exists and write file
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(predictions, null, 2), "utf8");

  console.log(
    `Wrote ${predictions.length} predictions to ${OUT_PATH}. Now run: npm run eval:predictions`
  );

  await mongoose.connection.close();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Error generating predictions:", err);
  try {
    await mongoose.connection.close();
  } catch (_) {}
  process.exit(1);
});
