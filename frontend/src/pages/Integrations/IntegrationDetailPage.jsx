// src/pages/Integrations/IntegrationDetailPage.jsx
import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, RotateCw, AlertCircle, Clock } from "lucide-react";
import Card from "../../components/ui/Card";
import { useIntegration } from "../../query/hooks/useIntegration";
import { useIntegrationHealth } from "../../query/hooks/useIntegrationHealth";
import { useSyncIntegration } from "../../query/mutations/useSyncIntegration";
import { useToastStore } from "../../store/toastStore";

export default function IntegrationDetailPage() {
  const { id } = useParams();
  const integrationId = String(id || "").trim();

  const {
    data: integration,
    isLoading,
    isError,
  } = useIntegration(integrationId);
  const {
    data: health,
    isLoading: healthLoading,
    isError: healthError,
  } = useIntegrationHealth(integrationId);

  const sync = useSyncIntegration();
  const { showToast } = useToastStore();

  const jobs = useMemo(() => {
    if (!health) return [];
    if (Array.isArray(health.jobs)) return health.jobs;
    if (Array.isArray(health.history)) return health.history;
    return [];
  }, [health]);

  const lastJob = jobs[0] || null;

  const statusStyles = getStatusStyles(integration?.status);

  const handleSyncNow = () => {
    if (!integrationId || sync.isPending) return;
    sync.mutate(integrationId, {
      onSuccess: () => {
        showToast({
          type: "success",
          title: "Sync triggered",
          message: "We started a new sync. Refresh this page in a minute.",
        });
      },
      onError: (err) => {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Sync could not be started.";
        showToast({
          type: "error",
          title: "Sync failed",
          message: msg,
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white text-xs text-neutral-600 dark:bg-[#050506] dark:text-zinc-400">
        Loading integration…
      </div>
    );
  }

  if (isError || !integration) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-white px-6 text-xs text-red-500 dark:bg-[#050506] dark:text-red-400">
        <p>Failed to load this integration.</p>
        <Link
          to="/integrations"
          className="mt-3 text-[11px] text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
        >
          Back to integrations
        </Link>
      </div>
    );
  }

  const displayName = integration.name || "Unnamed integration";
  const provider = integration.provider || "Unknown provider";
  const type = integration.type || "Unknown type";
  const baseUrl = integration.baseUrl || integration.url || null;

  const lastSyncAt =
    integration.lastSyncAt ||
    health?.lastSyncAt ||
    (lastJob && (lastJob.finishedAt || lastJob.startedAt)) ||
    null;

  const lastSyncStatus =
    health?.lastSyncStatus || (lastJob && lastJob.status) || null;

  return (
    <div className="min-h-full w-full bg-white text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
        {/* HEADER / BREADCRUMB */}
        <header className="flex flex-col gap-3 border-b border-neutral-200 pb-4 dark:border-zinc-900">
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-zinc-500">
            <Link
              to="/integrations"
              className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-2 py-1 text-[11px] text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:text-neutral-900 dark:border-zinc-800 dark:bg-black/60 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="h-3 w-3" />
            </Link>
            <span className="mx-1 text-[10px] text-neutral-400 dark:text-zinc-600">
              /
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
              {provider}
            </span>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold leading-tight text-neutral-900 dark:text-zinc-50 md:text-2xl">
                  {displayName}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles.bg} ${statusStyles.text}`}
                >
                  <span
                    className={`mr-1 h-1.5 w-1.5 rounded-full ${statusStyles.dot}`}
                  />
                  {integration.status || "unknown"}
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-zinc-400">
                {provider} · {type}
              </p>
              {baseUrl && (
                <p className="text-[11px] text-neutral-500 dark:text-zinc-500">
                  Base URL:{" "}
                  <span className="font-mono text-neutral-800 dark:text-zinc-100">
                    {baseUrl}
                  </span>
                </p>
              )}
            </div>

            {/* SYNC BUTTON */}
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={sync.isPending}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-[11px] font-medium text-white shadow-md shadow-blue-500/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sync.isPending ? (
                  <>
                    <span className="h-3 w-3 animate-spin rounded-full border border-white/40 border-t-transparent" />
                    Syncing…
                  </>
                ) : (
                  <>
                    <RotateCw size={14} />
                    Sync now
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* SUMMARY STRIP */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border border-neutral-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-black/80">
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
              Connection status
            </p>
            <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-zinc-50">
              {integration.status || "unknown"}
            </p>
            <p className="mt-1 text-[11px] text-neutral-600 dark:text-zinc-500">
              We use this connection to pull Jira epics into the radar.
            </p>
          </Card>

          <Card className="border border-neutral-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-black/80">
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
              Last sync
            </p>
            <p className="mt-2 flex items-center gap-1 text-sm text-neutral-900 dark:text-zinc-50">
              <Clock
                size={14}
                className="text-neutral-500 dark:text-zinc-400"
              />
              {lastSyncAt ? formatDateTime(lastSyncAt) : "Never"}
            </p>
            <p className="mt-1 text-[11px] text-neutral-600 dark:text-zinc-500">
              {lastSyncStatus
                ? `Last run status: ${lastSyncStatus}`
                : "Once a sync finishes, status appears here."}
            </p>
          </Card>

          <Card className="border border-neutral-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-black/80">
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
              Troubleshooting
            </p>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-neutral-700 dark:text-zinc-200">
              <AlertCircle size={14} className="text-amber-500" />
              If syncs keep failing, check Jira credentials, base URL, and
              project permissions.
            </p>
          </Card>
        </section>

        {/* SYNC HISTORY */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
                Sync history
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-zinc-400">
                Recent sync runs, newest first.
              </p>
            </div>
          </div>

          {healthLoading ? (
            <Card className="border border-neutral-200 bg-white px-4 py-4 text-[11px] text-neutral-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-500">
              Loading sync history…
            </Card>
          ) : healthError ? (
            <Card className="border border-red-200 bg-red-50 px-4 py-4 text-[11px] text-red-600 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
              Failed to load sync history for this integration.
            </Card>
          ) : jobs.length === 0 ? (
            <Card className="border border-dashed border-neutral-200 bg-white px-4 py-4 text-[11px] text-neutral-600 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-500">
              No sync jobs yet. Trigger a sync to see history here.
            </Card>
          ) : (
            <Card className="border border-neutral-200 bg-white px-0 py-0 text-[11px] text-neutral-700 dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-200">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-1 text-[11px]">
                  <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:bg-black dark:text-zinc-500">
                    <tr>
                      <th className="px-4 py-2 text-left font-normal">
                        Started
                      </th>
                      <th className="px-4 py-2 text-left font-normal">
                        Finished
                      </th>
                      <th className="px-4 py-2 text-left font-normal">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left font-normal">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id || job._id}>
                        <td className="px-4 py-1 align-top">
                          {job.startedAt ? formatDateTime(job.startedAt) : "—"}
                        </td>
                        <td className="px-4 py-1 align-top">
                          {job.finishedAt
                            ? formatDateTime(job.finishedAt)
                            : "—"}
                        </td>
                        <td className="px-4 py-1 align-top">
                          <JobStatusPill status={job.status} />
                        </td>
                        <td className="px-4 py-1 align-top">
                          <span className="block max-w-xs truncate text-[11px] text-neutral-600 dark:text-zinc-400">
                            {job.message ||
                              job.error ||
                              job.summary ||
                              "No extra details"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

/* Helpers */

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
  if (status === "disconnected") {
    return {
      bg: "bg-neutral-100 dark:bg-zinc-700/30",
      text: "text-neutral-700 dark:text-zinc-200",
      dot: "bg-neutral-500 dark:bg-zinc-300",
    };
  }
  return {
    bg: "bg-neutral-100 dark:bg-zinc-700/30",
    text: "text-neutral-700 dark:text-zinc-200",
    dot: "bg-neutral-500 dark:bg-zinc-300",
  };
}

function JobStatusPill({ status }) {
  const s = (status || "unknown").toLowerCase();
  let bg = "bg-neutral-100 dark:bg-zinc-800";
  let text = "text-neutral-700 dark:text-zinc-200";

  if (s === "success" || s === "completed") {
    bg = "bg-emerald-500/10";
    text = "text-emerald-700 dark:text-emerald-200";
  } else if (s === "failed" || s === "error") {
    bg = "bg-red-500/10";
    text = "text-red-700 dark:text-red-200";
  } else if (s === "running" || s === "in_progress") {
    bg = "bg-amber-500/10";
    text = "text-amber-700 dark:text-amber-200";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${bg} ${text}`}
    >
      {status || "unknown"}
    </span>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
