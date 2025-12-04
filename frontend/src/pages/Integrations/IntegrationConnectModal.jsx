import Modal from "../../components/ui/Modal";

export default function IntegrationConnectModal({ integration, onClose }) {
  if (!integration) return null;

  const isPlanned = integration.status === "planned";
  const isError = integration.status === "error";

  return (
    <Modal
      open={!!integration}
      title={`Connect ${integration.name}`}
      onClose={onClose}
    >
      <p className="text-xs text-zinc-400">{integration.description}</p>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-neutral-900 p-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          What KalMatrix will read
        </p>
        <ul className="mt-2 list-disc pl-4 text-xs text-zinc-300">
          <li>{integration.scope || "Relevant delivery signals."}</li>
          <li>No source code contents are stored.</li>
          <li>
            Only metadata & events are used to compute risk and predictions.
          </li>
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-800 bg-neutral-900 p-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">
          Connection flow (mock)
        </p>
        <p className="mt-2 text-xs text-zinc-300">
          In a real environment, this step would open{" "}
          <span className="font-medium">{integration.vendor}</span>&apos;s OAuth
          consent screen, then redirect back to KalMatrix with a token.
        </p>
      </div>

      {isError && (
        <p className="mt-3 text-xs text-red-400">
          Current status: {integration.errorMessage || "Integration error."}
        </p>
      )}

      {isPlanned && (
        <p className="mt-3 text-xs text-zinc-500">
          This integration is planned. Connection flow is disabled in the MVP.
        </p>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          disabled={isPlanned}
          className={`rounded-lg px-3 py-1.5 text-xs ${
            isPlanned
              ? "cursor-not-allowed border border-zinc-700 bg-neutral-900 text-zinc-500"
              : "border border-emerald-500/70 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
          }`}
        >
          {isPlanned ? "Coming soon" : "Simulate OAuth Connect"}
        </button>
      </div>
    </Modal>
  );
}
