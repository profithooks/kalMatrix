// src/components/ui/RiskBadge.jsx
export default function RiskBadge({ risk, band }) {
  let riskPercent = null;

  if (typeof risk === "number") {
    riskPercent = Math.round(risk);
  }

  // If band not passed, derive from numeric risk
  let effectiveBand = band;
  if (!effectiveBand) {
    if (riskPercent != null) {
      if (riskPercent >= 70) effectiveBand = "red_zone";
      else if (riskPercent >= 40) effectiveBand = "at_risk";
      else effectiveBand = "healthy";
    } else {
      effectiveBand = "healthy";
    }
  }

  let bgClass = "bg-emerald-500/10";
  let textClass = "text-emerald-600 dark:text-emerald-300";
  if (effectiveBand === "at_risk") {
    bgClass = "bg-amber-500/10";
    textClass = "text-amber-600 dark:text-amber-300";
  } else if (effectiveBand === "red_zone") {
    bgClass = "bg-red-500/10";
    textClass = "text-red-600 dark:text-red-300";
  }

  const label =
    effectiveBand === "red_zone"
      ? "Red zone"
      : effectiveBand === "at_risk"
      ? "At risk"
      : "Healthy";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${bgClass} ${textClass}`}
    >
      {label}
      {riskPercent != null && (
        <span className="ml-1 font-mono">{riskPercent}%</span>
      )}
    </span>
  );
}
