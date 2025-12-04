import dayjs from "dayjs";

export default function TopBar() {
  const now = dayjs().format("ddd, DD MMM YYYY");

  return (
    <header className="flex items-center justify-between border-b border-zinc-800 bg-surface px-6 py-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Delivery Radar</h1>
        <p className="text-xs text-zinc-400">
          Early warning system for epic slippage.
        </p>
      </div>
      <div className="flex items-center gap-4 text-xs text-zinc-400">
        <span>{now}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-accentSoft px-3 py-1 text-[11px] text-zinc-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Pilot Mode
        </span>
      </div>
    </header>
  );
}
