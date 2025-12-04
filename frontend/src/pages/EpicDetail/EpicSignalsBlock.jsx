import { useState } from "react";

export default function EpicSignalsBlock({ signals }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="flex flex-col gap-3">
      {signals.map((sig, idx) => {
        const open = openIndex === idx;

        return (
          <div
            key={idx}
            className="rounded-xl border border-zinc-800 bg-neutral-900 p-4"
          >
            <div
              className="flex justify-between cursor-pointer"
              onClick={() => setOpenIndex(open ? null : idx)}
            >
              <span className="text-sm text-zinc-200">{sig}</span>

              <span className="text-xs text-zinc-500">
                {open ? "Hide" : "Details"}
              </span>
            </div>

            {open && (
              <div className="mt-3 rounded-lg bg-neutral-800 p-3 text-xs text-zinc-400">
                <p className="font-medium text-zinc-300">Evidence Snapshot</p>
                <ul className="mt-2 list-disc pl-4">
                  <li>Possible idle PRs</li>
                  <li>Stagnation spikes</li>
                  <li>Late deploy signals</li>
                </ul>

                <div className="mt-3 border-t border-zinc-700 pt-3">
                  <p className="font-medium text-zinc-300">Suggested Actions</p>

                  <ul className="mt-2 list-disc pl-4">
                    <li>Assign fallback reviewers</li>
                    <li>Trigger staging deploy</li>
                    <li>Clear review backlog</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
