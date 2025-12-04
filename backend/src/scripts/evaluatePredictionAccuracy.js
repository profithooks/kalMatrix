// src/scripts/evaluatePredictionAccuracy.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRED_PATH = path.join(__dirname, "..", "data", "epic_predictions.json");
const OUTCOME_PATH = path.join(__dirname, "..", "data", "epic_outcomes.csv");

// --- Helpers ---

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`JSON file not found: ${filePath}`);
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf8");
  if (!raw.trim()) return [];
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

function loadCsvOutcomes(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`CSV outcomes file not found: ${filePath}`);
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];

  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? "").trim();
    });
    records.push(row);
  }

  return records;
}

// decide whether a prediction counts as "high risk"
function getPredictedBand(pred) {
  if (!pred) return "unknown";

  // Prefer explicit band / level from file
  const level =
    pred.riskLevel ||
    pred.band ||
    pred.predictedBand ||
    pred.predictionBand ||
    null;

  if (level) return String(level).toLowerCase();

  // Fallback: derive from probability (0–100)
  const prob = typeof pred.probability === "number" ? pred.probability : null;
  if (prob == null || Number.isNaN(prob)) return "unknown";

  if (prob >= 65) return "off_track";
  if (prob >= 50) return "at_risk";
  return "on_track";
}

function isPredHighRisk(pred) {
  const band = getPredictedBand(pred);
  return band === "off_track" || band === "at_risk";
}

// decide whether ground truth says "this was actually high-risk"
function getActualLabel(row) {
  // Support various header names: actual, actualBand, outcome, label...
  return (
    row.actualBand ||
    row.actual_band ||
    row.actual ||
    row.outcome ||
    row.label ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();
}

function isActualHighRisk(row) {
  const label = getActualLabel(row);

  // treat these as "high-risk / slipped"
  const HIGH = new Set([
    "late",
    "slipped",
    "slipped_badly",
    "off_track",
    "red_zone",
    "high_risk",
  ]);

  return HIGH.has(label);
}

function isActualLowRisk(row) {
  const label = getActualLabel(row);
  const LOW = new Set(["on_time", "healthy", "green", "low_risk"]);
  return LOW.has(label);
}

// --- Main ---

async function main() {
  const predictions = loadJson(PRED_PATH);
  const outcomes = loadCsvOutcomes(OUTCOME_PATH);

  // Build map by epic key
  const predictionsByKey = {};
  for (const p of predictions) {
    const key = (p.key || p.epicKey || p.epic_key || "").toString().trim();
    if (!key) continue;
    predictionsByKey[key] = p;
  }

  let TP = 0; // predicted high, actually high
  let FP = 0; // predicted high, actually low
  let TN = 0; // predicted low, actually low
  let FN = 0; // predicted low, actually high

  const interestingMisses = [];

  for (const row of outcomes) {
    const key = (row.key || row.epicKey || row.epic_key || "").trim();
    if (!key) continue;

    const pred = predictionsByKey[key];
    if (!pred) {
      console.log(`No prediction found for epic key=${key}`);
      continue;
    }

    const predictedHigh = isPredHighRisk(pred);
    const actualHigh = isActualHighRisk(row);
    const actualLow = isActualLowRisk(row);

    if (predictedHigh && actualHigh) {
      TP++;
    } else if (predictedHigh && actualLow) {
      FP++;
      interestingMisses.push({
        type: "FP",
        key,
        predicted: getPredictedBand(pred),
        actual: getActualLabel(row),
      });
    } else if (!predictedHigh && actualLow) {
      TN++;
    } else if (!predictedHigh && actualHigh) {
      FN++;
      interestingMisses.push({
        type: "FN",
        key,
        predicted: getPredictedBand(pred),
        actual: getActualLabel(row),
      });
    }
  }

  const totalLabelled = TP + FP + TN + FN;

  const accuracy = totalLabelled > 0 ? ((TP + TN) / totalLabelled) * 100 : 0;
  const precision = TP + FP > 0 ? (TP / (TP + FP)) * 100 : 0;
  const recall = TP + FN > 0 ? (TP / (TP + FN)) * 100 : 0;

  console.log("==== Hamza Prediction Accuracy ====");
  console.log(`Total labelled epics: ${totalLabelled}`);
  console.log(`TP (correct high-risk)   : ${TP}`);
  console.log(`FP (over-alerting)       : ${FP}`);
  console.log(`TN (correct low-risk)    : ${TN}`);
  console.log(`FN (missed high-risk)    : ${FN}`);
  console.log("");
  console.log(`Accuracy  : ${accuracy.toFixed(1)}%`);
  console.log(`Precision : ${precision.toFixed(1)}%`);
  console.log(`Recall    : ${recall.toFixed(1)}%`);

  if (interestingMisses.length > 0) {
    console.log("\nSome interesting misses:");
    for (const miss of interestingMisses) {
      console.log(
        `- [${miss.type}] key=${miss.key} predicted=${miss.predicted} actual=${miss.actual}`
      );
    }
  } else {
    console.log(
      "\nNo misses for the labelled epics. Engine matches ground truth."
    );
  }
}

main().catch((err) => {
  console.error("Error evaluating prediction accuracy:", err);
  process.exit(1);
});
