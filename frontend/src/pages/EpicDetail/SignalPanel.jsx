import { AlertTriangle, CheckCircle, Info } from "lucide-react";

export default function SignalPanel({ signals }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-neutral-900 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-white mb-3">Signals</h2>
      <p className="text-sm text-zinc-500 mb-6">
        Objective signals used to generate the prediction window & risk score.
      </p>

      <div className="flex flex-col gap-3">
        {signals.map((s, index) => {
          const isHigh = s.severity === "high";
          const isMed = s.severity === "medium";

          return (
            <div
              key={index}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-neutral-950/40 px-4 py-3"
            >
              {/* Left */}
              <div className="flex items-center gap-3">
                {isHigh && <AlertTriangle size={18} className="text-red-400" />}
                {isMed && <Info size={18} className="text-yellow-400" />}
                {!isHigh && !isMed && (
                  <CheckCircle size={18} className="text-emerald-400" />
                )}

                <div className="flex flex-col">
                  <p className="text-sm text-zinc-200">{s.message}</p>
                  <p className="text-xs text-zinc-500">Code: {s.code}</p>
                </div>
              </div>

              {/* Right */}
              <div>
                {isHigh && (
                  <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                    HIGH
                  </span>
                )}
                {isMed && (
                  <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400">
                    MEDIUM
                  </span>
                )}
                {!isHigh && !isMed && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400">
                    LOW
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
