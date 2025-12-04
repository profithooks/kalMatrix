import Card from "../../components/ui/Card";

export default function WhyAtRiskCard({ epic }) {
  const riskPercent = Math.round(epic.risk * 100);

  const topSignals = (epic.signals || []).slice(0, 3);

  return (
    <Card>
      <h2 className="text-sm font-semibold text-white">
        Why this epic is at risk
      </h2>
      <p className="mt-1 text-xs text-zinc-400">
        KalMatrix combines multiple signals from Jira, Git, CI/CD and calendars to
        forecast delivery risk.
      </p>

      <div className="mt-4 rounded-xl bg-neutral-900/70 p-3">
        <p className="text-xs text-zinc-400">Predicted slip window</p>
        <p className="mt-1 text-sm text-zinc-100">{epic.window}</p>
        <p className="mt-2 text-xs text-zinc-400">
          Current risk score:{" "}
          <span className="font-semibold text-red-400">{riskPercent}%</span>
        </p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          Key signals
        </p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-zinc-300">
          {topSignals.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
          {topSignals.length === 0 && (
            <li className="text-zinc-500">
              No negative signals detected. Epic appears healthy.
            </li>
          )}
        </ul>
      </div>
    </Card>
  );
}
