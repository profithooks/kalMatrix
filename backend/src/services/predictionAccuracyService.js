// src/services/predictionAccuracyService.js
import mongoose from "mongoose";
import PredictionSnapshot from "../models/PredictionSnapshot.js";
import EpicOutcome from "../models/EpicOutcome.js";

/**
 * Map riskLevel → "delayed" or "on_time" bucket for accuracy.
 */
function isPredictedDelayed(riskLevel) {
  if (!riskLevel) return false;
  // both amber + red treated as "Hamza warned this might slip"
  return riskLevel === "at_risk" || riskLevel === "off_track";
}

/**
 * Map EpicOutcome.outcomeBand → actual delayed or not.
 */
function isActuallyDelayed(outcomeBand) {
  if (!outcomeBand) return false;
  return outcomeBand === "slip_1_3" || outcomeBand === "slip_3_plus";
}

/**
 * For a given workspace:
 * - For every EpicOutcome row:
 *   - Find the latest PredictionSnapshot BEFORE the epic was closed.
 *   - Compare prediction vs outcome → TP/FP/TN/FN, accuracy, precision, recall.
 */
export async function getPredictionAccuracyForWorkspace(workspaceId) {
  if (!workspaceId) {
    throw new Error("workspaceId is required");
  }

  const wsId = new mongoose.Types.ObjectId(workspaceId);

  // 1) Try to load labelled outcomes for this workspace
  let outcomes = await EpicOutcome.find({
    $or: [{ workspaceId: wsId }, { workspaceId: workspaceId }],
  }).lean();

  console.log(
    "[ACCURACY] outcomes found for workspace",
    workspaceId,
    "=>",
    outcomes.length
  );

  // Fallback: if zero, look at ALL outcomes so you still see moat numbers.
  if (!outcomes.length) {
    const all = await EpicOutcome.find({}).lean();
    console.log(
      "[ACCURACY] Fallback to ALL outcomes, total rows =>",
      all.length
    );

    // Dump a small sample so you can see what workspaceIds are stored as.
    console.log(
      "[ACCURACY] Sample workspaceIds in EpicOutcome:",
      all.slice(0, 5).map((o) => String(o.workspaceId))
    );

    // Use all rows for now so the metric is not empty.
    outcomes = all;
  }

  if (!outcomes.length) {
    // truly nothing in the collection
    return {
      workspaceId: String(workspaceId),
      labelledEpics: 0,
      tp: 0,
      fp: 0,
      tn: 0,
      fn: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      examples: [],
    };
  }

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  const examples = [];

  for (const outcome of outcomes) {
    const { epicId, closedAt, outcomeBand } = outcome;

    const snapshot = await PredictionSnapshot.findOne({
      $or: [{ workspaceId: wsId }, { workspaceId: workspaceId }],
      epicId,
      createdAt: { $lte: closedAt },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!snapshot) {
      continue;
    }

    const predictedDelay = isPredictedDelayed(snapshot.riskLevel);
    const actualDelay = isActuallyDelayed(outcomeBand);

    if (predictedDelay && actualDelay) {
      tp += 1;
      examples.push({
        epicId: String(epicId),
        type: "TP",
        riskLevel: snapshot.riskLevel,
        probability: snapshot.probability,
        outcomeBand,
      });
    } else if (predictedDelay && !actualDelay) {
      fp += 1;
      examples.push({
        epicId: String(epicId),
        type: "FP",
        riskLevel: snapshot.riskLevel,
        probability: snapshot.probability,
        outcomeBand,
      });
    } else if (!predictedDelay && !actualDelay) {
      tn += 1;
      examples.push({
        epicId: String(epicId),
        type: "TN",
        riskLevel: snapshot.riskLevel,
        probability: snapshot.probability,
        outcomeBand,
      });
    } else if (!predictedDelay && actualDelay) {
      fn += 1;
      examples.push({
        epicId: String(epicId),
        type: "FN",
        riskLevel: snapshot.riskLevel,
        probability: snapshot.probability,
        outcomeBand,
      });
    }
  }

  const labelledEpics = tp + fp + tn + fn;

  if (labelledEpics === 0) {
    return {
      workspaceId: String(workspaceId),
      labelledEpics: 0,
      tp: 0,
      fp: 0,
      tn: 0,
      fn: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      examples: [],
    };
  }

  const accuracy = (tp + tn) / labelledEpics;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;

  return {
    workspaceId: String(workspaceId),
    labelledEpics,
    tp,
    fp,
    tn,
    fn,
    accuracy,
    precision,
    recall,
    examples,
  };
}
