export default function DeliveryRadarTable({ data, onRowClick }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-neutral-900 p-4 shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-800 text-xs text-zinc-400">
          <tr>
            <th className="py-2 text-left">Epic</th>
            <th className="py-2 text-left">Risk</th>
            <th className="py-2 text-left">Prediction</th>
            <th className="py-2 text-left">Signals</th>
            <th className="py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => {
            const riskPercent = Math.round(item.risk * 100);

            return (
              <tr
                key={item.id}
                className="border-b border-zinc-900/60 last:border-b-0 cursor-pointer hover:bg-neutral-800/70 transition-colors"
                onClick={() => onRowClick && onRowClick(item)}
              >
                <td className="py-3 text-zinc-200">{item.epic}</td>
                <td className="py-3 font-semibold">{riskPercent}%</td>
                <td className="py-3">{item.window}</td>
                <td className="py-3">
                  <span
                    className="text-xs text-zinc-400 underline-offset-2"
                    title={item.signals.join(" • ")}
                  >
                    {item.signals.length} signals
                  </span>
                </td>
                <td className="py-3">
                  {riskPercent >= 50 ? (
                    <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                      At Risk
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400">
                      Healthy
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
