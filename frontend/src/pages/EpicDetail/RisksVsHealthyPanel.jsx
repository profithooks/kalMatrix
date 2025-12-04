import Card from "../../components/ui/Card";

export default function RisksVsHealthyPanel() {
  // static for now; later you can derive from backend signals
  const risks = [
    "Cycle time trending above historical baseline.",
    "PR review latency higher than target.",
    "Low staging deployment frequency last 14 days.",
  ];

  const healthy = [
    "No major production incidents linked to this epic.",
    "Team capacity stable over the last 2 weeks.",
    "Issue throughput roughly matches forecast.",
  ];

  return (
    <Card>
      <h2 className="text-sm font-semibold text-white">
        Risk vs. Healthy indicators
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-red-400">Risks</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-zinc-300">
            {risks.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-emerald-400">
            Healthy signals
          </p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs text-zinc-300">
            {healthy.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
