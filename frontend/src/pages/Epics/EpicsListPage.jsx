import Card from "../../components/ui/Card";

export default function EpicsListPage() {
  return (
    <div className="p-6">
      <Card>
        <h2 className="text-sm font-semibold">Epics</h2>
        <p className="mt-1 text-xs text-zinc-400">
          List of all epics with their current risk.
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-zinc-700 p-6 text-center text-xs text-zinc-500">
          Epic list will appear here once API is ready.
        </div>
      </Card>
    </div>
  );
}
