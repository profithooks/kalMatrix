export default function RiskDistributionBar({ counts }) {
  const total = counts?.total ?? 0;
  const atRisk = counts?.atRisk ?? 0;
  const redZone = counts?.redZone ?? 0;

  if (!total) {
    return <div className="h-3 w-full rounded-full bg-zinc-900" />;
  }

  const redPct = Math.round((redZone / total) * 100);
  const atRiskPct = Math.round(((atRisk - redZone) / total) * 100);
  const healthyPct = Math.max(0, 100 - redPct - atRiskPct);

  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-900">
      {redPct > 0 && (
        <div className="h-full bg-red-500/80" style={{ width: `${redPct}%` }} />
      )}
      {atRiskPct > 0 && (
        <div
          className="h-full bg-amber-400/80"
          style={{ width: `${atRiskPct}%` }}
        />
      )}
      {healthyPct > 0 && (
        <div
          className="h-full bg-emerald-500/80"
          style={{ width: `${healthyPct}%` }}
        />
      )}
    </div>
  );
}
