// src/pages/Integrations/IntegrationCard.jsx
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RotateCw, ExternalLink } from "lucide-react";
import Card from "../../components/ui/Card";
import { useSyncIntegration } from "../../query/mutations/useSyncIntegration";

export default function IntegrationCard({ item }) {
  const navigate = useNavigate();
  const sync = useSyncIntegration();

  const id = useMemo(() => item.id || item._id || item.integrationId, [item]);

  const statusStyles = getStatusStyles(item.status);

  const handleGoToDetail = () => {
    if (!id) return;
    navigate(`/integrations/${id}`);
  };

  const handleSync = (e) => {
    e.stopPropagation();
    if (!id || sync.isPending) return;
    sync.mutate(id);
  };

  const isSyncing = sync.isPending && sync.variables === id;

  const infoText = [
    item.provider ? `Provider: ${item.provider}` : null,
    item.type ? `Type: ${item.type}` : null,
    item.baseUrl ? `Base URL: ${item.baseUrl}` : null,
    item.status ? `Status: ${item.status}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const isConnected = item.status === "connected";

  return (
    <Card
      className="flex flex-col gap-3 border border-neutral-200 bg-white px-4 py-4 text-sm shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-zinc-900 dark:bg-black/80 dark:hover:border-zinc-700 dark:hover:bg-black"
      onClick={handleGoToDetail}
    >
      {/* TOP ROW: title + icons */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-1">
          <p className="text-sm font-medium text-neutral-900 dark:text-zinc-100">
            {item.name || "Unnamed integration"}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-zinc-500">
            {item.provider || "Unknown provider"}
            {item.type ? ` · ${item.type}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync button */}
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing || !isConnected}
            title={isConnected ? "Sync now" : "Connect first to sync"}
            className="rounded-full border border-neutral-200 bg-white p-1.5 text-neutral-500 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:bg-black dark:hover:text-zinc-100"
          >
            <RotateCw
              size={14}
              className={isSyncing ? "animate-spin" : undefined}
            />
          </button>

          {/* Detail / expand button */}
          <Link
            to={id ? `/integrations/${id}` : "#"}
            onClick={(e) => {
              e.stopPropagation();
              if (!id) e.preventDefault();
            }}
            title="View integration details"
            className="rounded-full border border-neutral-200 bg-white p-1.5 text-neutral-500 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50 hover:text-neutral-800 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-500 dark:hover:border-zinc-600 dark:hover:bg-black dark:hover:text-zinc-100"
          >
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* STATUS PILL */}
      <span
        className={`inline-flex w-fit items-center rounded-full px-2 py-1 text-[11px] font-medium ${statusStyles.bg} ${statusStyles.text}`}
      >
        <span className={`mr-1 h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} />
        {item.status || "unknown"}
      </span>

      {/* LAST SYNC */}
      {item.lastSyncAt && (
        <p className="text-[11px] text-neutral-500 dark:text-zinc-500">
          Last sync:{" "}
          {new Date(item.lastSyncAt).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      {/* BOTTOM ROW: info + view/connect CTA */}
      <div className="mt-1 flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-zinc-500"
          title={infoText || "No additional integration details"}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 dark:bg-zinc-500" />
          <span>Details &amp; sync history</span>
        </span>

        <Link
          to={id ? `/integrations/${id}` : "#"}
          onClick={(e) => {
            e.stopPropagation();
            if (!id) e.preventDefault();
          }}
          className="text-[11px] font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          {isConnected ? "View" : "Connect"}
        </Link>
      </div>
    </Card>
  );
}

function getStatusStyles(status) {
  if (status === "connected") {
    return {
      bg: "bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-200",
      dot: "bg-emerald-500",
    };
  }
  if (status === "error") {
    return {
      bg: "bg-red-500/10",
      text: "text-red-700 dark:text-red-200",
      dot: "bg-red-500",
    };
  }
  // disconnected / unknown
  return {
    bg: "bg-neutral-100 dark:bg-zinc-700/30",
    text: "text-neutral-700 dark:text-zinc-200",
    dot: "bg-neutral-500 dark:bg-zinc-300",
  };
}
