export default function EpicMetricsStrip() {
  // mock numbers for now
  const metrics = [
    {
      label: "Cycle Time (last 7 days)",
      value: "22 days",
      sub: "Previous baseline: 14 days",
      trend: "+57%",
      trendType: "up",
    },
    {
      label: "PR Review Latency",
      value: "3.8 days",
      sub: "Target: < 2 days",
      trend: "+41%",
      trendType: "up",
    },
    {
      label: "Staging Deploy Frequency",
      value: "1 / 14 days",
      sub: "Target: 2 / week",
      trend: "-60%",
      trendType: "down",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {metrics.map((m) => {
        const isBad =
          (m.trendType === "up" && m.label.includes("Cycle")) ||
          (m.trendType === "up" && m.label.includes("PR")) ||
          (m.trendType === "down" && m.label.includes("Deploy"));

        const trendColor = isBad ? "text-red-400" : "text-emerald-400";

        return (
          <div
            key={m.label}
            className="rounded-2xl border border-zinc-800 bg-neutral-900 p-4"
          >
            <p className="text-xs uppercase text-zinc-500">{m.label}</p>
            <p className="mt-2 text-xl font-semibold text-zinc-100">
              {m.value}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{m.sub}</p>
            <p className={`mt-2 text-xs ${trendColor}`}>
              {m.trendType === "up" ? "↑" : "↓"} {m.trend}
            </p>
          </div>
        );
      })}
    </div>
  );
}
