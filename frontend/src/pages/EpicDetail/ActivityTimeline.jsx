// src/pages/EpicDetail/ActivityTimeline.jsx
import Card from "../../components/ui/Card";

export default function ActivityTimeline({ timeline, isLoading }) {
  if (isLoading) {
    return (
      <Card className="border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-xs text-neutral-500">Loading epic timeline…</p>
      </Card>
    );
  }

  if (!Array.isArray(timeline) || timeline.length === 0) {
    return (
      <Card className="border border-neutral-800 bg-neutral-950 p-4">
        <p className="text-xs text-neutral-500">
          No timeline events yet. Once this epic starts moving, major events
          will appear here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border border-neutral-800 bg-neutral-950 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
        Epic timeline
      </p>
      <p className="mt-1 text-sm text-neutral-400">
        Major delivery events: creation, first movement, slips, check-ins, and
        closure.
      </p>

      <div className="mt-4 space-y-3">
        {timeline.map((event, index) => {
          const isLast = index === timeline.length - 1;
          const label = event.label || event.type || "Event";
          const dateStr =
            event.at && typeof event.at === "string"
              ? new Date(event.at).toLocaleDateString()
              : event.at
              ? new Date(event.at).toLocaleString()
              : "Unknown date";

          return (
            <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                {!isLast && (
                  <span className="mt-1 h-10 w-px flex-1 bg-neutral-800" />
                )}
              </div>
              <div className="flex-1 rounded-xl bg-neutral-900/70 px-3 py-2">
                <p className="text-xs font-medium text-neutral-100">{label}</p>
                <p className="mt-1 text-[11px] text-neutral-500">{dateStr}</p>
                {event.detail && (
                  <p className="mt-1 text-[11px] text-neutral-400">
                    {event.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
