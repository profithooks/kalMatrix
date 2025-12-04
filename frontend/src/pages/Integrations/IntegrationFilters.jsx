import classNames from "classnames";

const filters = [
  "All",
  "Issue Tracker",
  "Code Host",
  "CI/CD",
  "Communication",
  "Calendar",
];

export default function IntegrationFilters({ active, onChange }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={classNames(
            "px-4 py-1.5 rounded-full text-xs border transition",
            active === f
              ? "border-zinc-500 bg-zinc-800 text-white"
              : "border-zinc-800 text-zinc-400 hover:bg-zinc-800"
          )}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
