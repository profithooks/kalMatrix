import { X } from "lucide-react";
import { useState } from "react";

export default function SignalsDrawer({ epic, onClose }) {
  const [openSignal, setOpenSignal] = useState(null);

  if (!epic) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      {/* Drawer Panel */}
      <div className="h-full w-[420px] animate-slide-left border-l border-zinc-800 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{epic.epic}</h2>
            <p className="text-xs text-zinc-400">Prediction: {epic.window}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Risk Score */}
        <div className="border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-red-400">
              {Math.round(epic.risk * 100)}%
            </div>
            <div className="text-sm text-zinc-400">
              Likely to slip in the next {epic.window}
            </div>
          </div>
        </div>

        {/* Signals */}
        <div className="px-5 py-4">
          <h3 className="text-xs font-semibold uppercase text-zinc-500">
            Signals Detected
          </h3>

          <div className="mt-3 flex flex-col gap-3">
            {epic.signals.map((sig, index) => {
              const isOpen = openSignal === index;

              return (
                <div
                  key={index}
                  className="rounded-xl border border-zinc-800 bg-neutral-900 p-3"
                >
                  {/* Signal Row */}
                  <div
                    className="flex cursor-pointer items-start justify-between"
                    onClick={() => setOpenSignal(isOpen ? null : index)}
                  >
                    <span className="text-sm text-zinc-200">{sig}</span>

                    <span className="text-xs text-zinc-500">
                      {isOpen ? "Hide" : "Details"}
                    </span>
                  </div>

                  {/* Expandable Evidence */}
                  {isOpen && (
                    <div className="mt-3 rounded-lg bg-neutral-800 p-3 text-xs text-zinc-400">
                      {/* MOCK evidence for now */}
                      <p className="font-medium text-zinc-300">
                        Evidence Snapshot
                      </p>
                      <ul className="mt-2 list-disc pl-4">
                        <li>Idle PRs: 2–4</li>
                        <li>Stagnation detected for 3+ days</li>
                        <li>Last activity: 14 days ago</li>
                      </ul>

                      {/* Actions */}
                      <div className="mt-3 border-t border-zinc-700 pt-3">
                        <p className="font-medium text-zinc-300">
                          Suggested Action
                        </p>

                        <ul className="mt-2 list-disc pl-4">
                          <li>Assign fallback reviewer</li>
                          <li>Trigger staging deployment</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes slide-left {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .animate-slide-left {
          animation: slide-left 0.28s ease-out;
        }
      `}</style>
    </div>
  );
}
