// src/pages/EpicDetail/PredictionIntelligencePanel.jsx
import Card from "../../components/ui/Card";

function formatConfidence(confidence) {
  if (confidence == null) return { label: "Unknown", tone: "neutral" };

  const c = confidence > 1 ? confidence / 100 : confidence; // handle 0–1 or 0–100

  if (c >= 0.85) return { label: "High", tone: "high" };
  if (c >= 0.6) return { label: "Medium", tone: "medium" };
  return { label: "Low", tone: "low" };
}

export default function PredictionIntelligencePanel({
  riskScore,
  band,
  predictionIntelligence,
}) {
  if (!predictionIntelligence) return null;

  const {
    confidence,
    strongSignals = [],
    weakSignals = [],
    missingSignals = [],
  } = predictionIntelligence;

  const { label: confidenceLabel, tone } = formatConfidence(confidence);

  let bandLabel = "On track";
  if (band === "red_zone" || band === "off_track") bandLabel = "Red zone";
  else if (band === "at_risk") bandLabel = "At risk";

  const toneClass =
    tone === "high"
      ? "text-emerald-400"
      : tone === "medium"
      ? "text-amber-400"
      : tone === "low"
      ? "text-red-400"
      : "text-zinc-400";

  return (
    <Card className="border border-neutral-800 bg-neutral-950 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
            Prediction intelligence
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Why KalMatrix thinks this epic will slip, and how sure it is.
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-neutral-500">Risk</p>
          <p className="font-mono text-lg text-neutral-100">
            {Math.round(riskScore ?? 0)}
            <span className="ml-1 text-[11px] uppercase tracking-[0.16em] text-neutral-500">
              / 100 · {bandLabel}
            </span>
          </p>
          <p className="mt-1 text-xs text-neutral-500">Confidence</p>
          <p className={`font-mono text-sm ${toneClass}`}>{confidenceLabel}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Bucket
          title="Strong signals"
          subtitle="Hard evidence pushing this epic into risk."
          items={strongSignals}
          tone="strong"
        />
        <Bucket
          title="Weak signals"
          subtitle="Soft indicators we’re watching."
          items={weakSignals}
          tone="weak"
        />
        <Bucket
          title="Missing signals"
          subtitle="Blind spots where data is incomplete."
          items={missingSignals}
          tone="missing"
        />
      </div>
    </Card>
  );
}

function Bucket({ title, subtitle, items, tone }) {
  let borderClass = "border-neutral-800";
  let dotClass = "bg-neutral-500";
  if (tone === "strong") {
    borderClass = "border-red-900/70";
    dotClass = "bg-red-500";
  } else if (tone === "weak") {
    borderClass = "border-amber-900/70";
    dotClass = "bg-amber-400";
  } else if (tone === "missing") {
    borderClass = "border-neutral-800";
    dotClass = "bg-neutral-500";
  }

  return (
    <div
      className={`flex h-full flex-col rounded-2xl border ${borderClass} bg-neutral-900/70 p-3`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <h3 className="text-xs font-semibold text-neutral-100">{title}</h3>
      </div>
      <p className="mt-1 text-[11px] text-neutral-500">{subtitle}</p>

      <div className="mt-3 flex-1 space-y-2">
        {Array.isArray(items) && items.length > 0 ? (
          items.map((msg, idx) => (
            <div
              key={idx}
              className="rounded-lg bg-neutral-900/80 px-3 py-2 text-xs text-neutral-200"
            >
              {msg}
            </div>
          ))
        ) : (
          <p className="text-xs text-neutral-500">
            No items in this bucket yet.
          </p>
        )}
      </div>
    </div>
  );
}
