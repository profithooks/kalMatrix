export default function RiskDistributionBar({
  total,
  healthy,
  atRisk,
  redZone,
}) {
  if (total === 0) return null;

  const h = (healthy / total) * 100;
  const a = (atRisk / total) * 100;
  const r = (redZone / total) * 100;

  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-900 shadow-inner">
      <div
        style={{ width: `${h}%` }}
        className="bg-gradient-to-r from-emerald-500/80 to-emerald-400"
      />
      <div
        style={{ width: `${a}%` }}
        className="bg-gradient-to-r from-amber-400/90 to-amber-300"
      />
      <div
        style={{ width: `${r}%` }}
        className="bg-gradient-to-r from-red-500/90 to-red-400"
      />
    </div>
  );
}
