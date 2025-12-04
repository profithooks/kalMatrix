import { useMemo } from "react";
import { Link } from "react-router-dom";
import Card from "../../components/ui/Card";
import RiskBadge from "../../components/ui/RiskBadge";
import { useEpicRiskData } from "../../query/hooks/useEpicRiskData";
import { useIntegrations } from "../../query/hooks/useIntegrations";

function classifyRisk(risk) {
  const p = Math.round(risk * 100);
  if (p >= 70) return "red_zone";
  if (p >= 50) return "at_risk";
  return "healthy";
}

export default function DashboardPage() {
  const { data: riskData, isLoading: loadingRisk } = useEpicRiskData();
  const { data: integrations, isLoading: loadingIntegrations } =
    useIntegrations();

  const epics = riskData?.epics || [];
  console.log("radarpage", epics);
  const summary = riskData?.summary || null;
  const integrationList = Array.isArray(integrations) ? integrations : [];

  const stats = useMemo(() => {
    const totalEpics = epics.length;
    const healthy = epics.filter(
      (e) => classifyRisk(e.risk) === "healthy"
    ).length;
    const atRisk = epics.filter(
      (e) => classifyRisk(e.risk) === "at_risk"
    ).length;
    const redZone = epics.filter(
      (e) => classifyRisk(e.risk) === "red_zone"
    ).length;

    const totalIntegrations = integrationList.length;
    const connected = integrationList.filter(
      (i) => i.status === "connected"
    ).length;

    const lastSync = integrationList
      .filter((i) => i.lastSyncAt)
      .sort(
        (a, b) =>
          new Date(b.lastSyncAt).getTime() - new Date(a.lastSyncAt).getTime()
      )[0];

    const hottestEpics = [...epics].sort((a, b) => b.risk - a.risk).slice(0, 5);

    return {
      totalEpics,
      healthy,
      atRisk,
      redZone,
      totalIntegrations,
      connected,
      lastSync,
      hottestEpics,
    };
  }, [epics, integrationList]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase text-zinc-500">Overview</p>
          <h1 className="text-2xl font-semibold text-white">
            Delivery Radar Overview
          </h1>
          <p className="text-sm text-zinc-500">
            One screen to see risk, integrations, and the hottest epics.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/radar"
            className="rounded-full bg-zinc-800 px-4 py-2 text-xs text-zinc-100 hover:bg-zinc-700"
          >
            View Radar
          </Link>
          <Link
            to="/integrations"
            className="rounded-full bg-blue-600 px-4 py-2 text-xs text-white hover:bg-blue-500"
          >
            Manage Integrations
          </Link>
        </div>
      </div>

      {/* Top row stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-zinc-500">Epics</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {loadingRisk ? "…" : stats.totalEpics}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-zinc-500">Healthy</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-400">
            {loadingRisk ? "…" : stats.healthy}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-zinc-500">At Risk</p>
          <p className="mt-2 text-2xl font-semibold text-amber-300">
            {loadingRisk ? "…" : stats.atRisk}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-zinc-500">Red Zone</p>
          <p className="mt-2 text-2xl font-semibold text-red-400">
            {loadingRisk ? "…" : stats.redZone}
          </p>
        </Card>
      </div>

      {/* Second row: integrations + summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Integrations snapshot */}
        <Card className="lg:col-span-1 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase text-zinc-500">Integrations</p>
            <Link
              to="/integrations"
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wide">
                Total
              </p>
              <p className="mt-1 text-zinc-100 font-semibold">
                {loadingIntegrations ? "…" : stats.totalIntegrations}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wide">
                Connected
              </p>
              <p className="mt-1 text-emerald-400 font-semibold">
                {loadingIntegrations ? "…" : stats.connected}
              </p>
            </div>
          </div>

          {stats.lastSync && (
            <div className="mt-3 text-xs text-zinc-400">
              <p>Last sync:</p>
              <p className="text-zinc-200">
                {stats.lastSync.name || stats.lastSync.provider} •{" "}
                {new Date(stats.lastSync.lastSyncAt).toLocaleString()}
              </p>
            </div>
          )}

          {integrationList.length > 0 && (
            <div className="mt-3 space-y-2 text-xs">
              {integrationList.slice(0, 3).map((i) => (
                <div
                  key={i.id || i._id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/70 px-2 py-1.5"
                >
                  <span className="truncate text-zinc-200">
                    {i.name || `${i.provider} (${i.type})`}
                  </span>
                  <span
                    className={
                      "ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium " +
                      (i.status === "connected"
                        ? "bg-emerald-900/40 text-emerald-400"
                        : i.status === "disconnected"
                        ? "bg-zinc-700/40 text-zinc-200"
                        : "bg-red-900/40 text-red-400")
                    }
                  >
                    {i.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Summary / narrative */}
        <Card className="lg:col-span-2 p-4 space-y-3">
          <p className="text-xs uppercase text-zinc-500">Snapshot</p>
          {summary ? (
            <div className="space-y-2 text-sm text-zinc-300">
              <p>
                {summary.totalEpics} epics in scope. {summary.redZone} in red
                zone, {summary.atRisk} at risk, {summary.healthy} healthy.
              </p>
              <p className="text-zinc-400 text-xs">
                Average probability of slippage:{" "}
                {summary.avgProbability
                  ? `${summary.avgProbability.toFixed(0)}%`
                  : "–"}
              </p>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              No prediction summary available yet. Run a sync from an
              integration to populate.
            </p>
          )}
        </Card>
      </div>

      {/* Hottest epics table */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase text-zinc-500">Hottest epics</p>
          <Link
            to="/epics"
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            View all epics
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-800 text-sm">
            <thead className="bg-zinc-950/60">
              <tr>
                <Th>Epic</Th>
                <Th>Risk</Th>
                <Th>Window</Th>
                <Th>Signals</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {stats.hottestEpics.length === 0 && (
                <tr>
                  <Td
                    colSpan={4}
                    className="py-4 text-center text-xs text-zinc-500"
                  >
                    No epics found. Sync Jira from Integrations first.
                  </Td>
                </tr>
              )}

              {stats.hottestEpics.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-900/60 cursor-pointer">
                  <Td className="max-w-xs truncate">{e.epic}</Td>
                  <Td>
                    <RiskBadge risk={e.risk} />
                  </Td>
                  <Td>{e.window}</Td>
                  <Td className="max-w-xs truncate text-xs text-zinc-400">
                    {e.signals?.[0] || "No strong signals"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
      {children}
    </th>
  );
}

function Td({ children, className = "", ...rest }) {
  return (
    <td className={`px-4 py-3 text-zinc-200 ${className}`} {...rest}>
      {children}
    </td>
  );
}
