// src/pages/Integrations/IntegrationsPage.jsx
import { useMemo, useState } from "react";
import { useIntegrations } from "../../query/hooks/useIntegrations";
import ConnectJiraModal from "../../components/modals/ConnectJiraModal";
import Card from "../../components/ui/Card";
import IntegrationCard from "./IntegrationCard";

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showConnectModal, setShowConnectModal] = useState(false);

  const { data, isLoading, isError } = useIntegrations();
  const integrationsData = data || [];

  const hasJiraIntegration = integrationsData.some(
    (i) =>
      (i.provider && i.provider.toLowerCase().includes("jira")) ||
      (i.type && i.type.toLowerCase().includes("jira"))
  );

  const { integrations, counts } = useMemo(() => {
    let list = [...integrationsData];

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name?.toLowerCase().includes(term) ||
          (i.provider && i.provider.toLowerCase().includes(term)) ||
          (i.type && i.type.toLowerCase().includes(term))
      );
    }

    if (filterStatus !== "all") {
      list = list.filter((i) => i.status === filterStatus);
    }

    const total = integrationsData.length;
    const connected = integrationsData.filter(
      (i) => i.status === "connected"
    ).length;
    const disconnected = integrationsData.filter(
      (i) => i.status === "disconnected"
    ).length;
    const error = integrationsData.filter((i) => i.status === "error").length;

    return {
      integrations: list,
      counts: { total, connected, disconnected, error },
    };
  }, [search, filterStatus, integrationsData]);

  const grouped = useMemo(() => {
    const g = {};
    for (const i of integrations) {
      const category = i.category || "Other";
      if (!g[category]) g[category] = [];
      g[category].push(i);
    }
    return g;
  }, [integrations]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white text-xs text-neutral-600 dark:bg-[#050506] dark:text-zinc-400">
        Loading integrations…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white p-8 text-xs text-red-500 dark:bg-[#050506] dark:text-red-400">
        Failed to load integrations. Please refresh.
      </div>
    );
  }

  const hasAnyVisible = integrations.length > 0;

  return (
    <div className="min-h-full w-full bg-white text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
      <ConnectJiraModal
        open={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
        {/* HERO */}
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-white sm:text-[28px] md:text-[30px]">
              Wire KalMatrix into the tools
              <br className="hidden sm:block" />
              <span className="sm:ml-1">that already run your org.</span>
            </h1>

            <p className="max-w-xl text-sm text-neutral-600 dark:text-zinc-400">
              {hasJiraIntegration
                ? "Jira is connected. Sync epics and let the radar watch delivery for you."
                : "No Jira connection yet. Connect Jira to ingest epics and start getting delivery risk predictions."}
            </p>

            {/* COUNTS */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-600 dark:text-zinc-500 sm:gap-3">
              <Pill>
                <span className="font-mono text-neutral-900 dark:text-zinc-100">
                  {counts.total || 0}
                </span>{" "}
                integrations configured
              </Pill>
              <Pill>
                <span className="font-mono text-emerald-600 dark:text-emerald-300">
                  {counts.connected || 0}
                </span>{" "}
                connected
              </Pill>
              <Pill>
                <span className="font-mono text-neutral-700 dark:text-zinc-200">
                  {counts.disconnected || 0}
                </span>{" "}
                disconnected
              </Pill>
              <Pill>
                <span className="font-mono text-red-600 dark:text-red-300">
                  {counts.error || 0}
                </span>{" "}
                with errors
              </Pill>
            </div>
          </div>

          <div className="flex items-start justify-start md:justify-end">
            <button
              onClick={() => setShowConnectModal(true)}
              className="inline-flex items-center gap-2 rounded-full border border-transparent bg-blue-600 px-5 py-2.5 text-xs font-medium text-white shadow-md shadow-blue-500/30 transition hover:bg-blue-500"
            >
              <span className="text-lg leading-none">+</span>
              {hasJiraIntegration
                ? "Connect another Jira site"
                : "Connect Jira"}
            </button>
          </div>
        </section>

        {/* STATS STRIP */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricTile label="Total" value={counts.total || 0} tone="neutral" />
          <MetricTile
            label="Connected"
            value={counts.connected || 0}
            tone="green"
          />
          <MetricTile
            label="Disconnected"
            value={counts.disconnected || 0}
            tone="zinc"
          />
          <MetricTile label="Error" value={counts.error || 0} tone="red" />
        </section>

        {/* CONTROLS */}
        <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="flex w-full items-center gap-2 md:max-w-xs">
            <input
              type="text"
              placeholder="Search integrations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              value={filterStatus}
              onChange={setFilterStatus}
              options={[
                { id: "all", label: "All" },
                { id: "connected", label: "Connected" },
                { id: "disconnected", label: "Disconnected" },
                { id: "error", label: "Error" },
              ]}
            />
          </div>
        </section>

        {/* GROUPED INTEGRATIONS */}
        <section className="space-y-6">
          {hasAnyVisible ? (
            Object.entries(grouped).map(([category, list]) => (
              <CategorySection key={category} category={category} list={list} />
            ))
          ) : (
            <Card className="border border-neutral-200 bg-white px-6 py-8 text-sm text-neutral-600 shadow-sm dark:border-zinc-900 dark:bg-black/80 dark:text-zinc-400">
              No integrations match the current filters.
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---- smaller components ---- */

function CategorySection({ category, list }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
        {category}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((item) => (
          <IntegrationCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function MetricTile({ label, value, tone }) {
  let bar;
  if (tone === "green") bar = "bg-emerald-400";
  else if (tone === "red") bar = "bg-red-400";
  else if (tone === "zinc") bar = "bg-neutral-400 dark:bg-zinc-300";
  else bar = "bg-neutral-400 dark:bg-zinc-400";

  return (
    <Card className="border border-neutral-200 bg-white px-4 py-4 shadow-sm dark:border-zinc-900 dark:bg-black/80">
      <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 dark:text-zinc-500">
        {label}
      </span>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-neutral-900 dark:text-zinc-50">
          {value}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-zinc-900">
        <div className={`h-full w-3/4 ${bar}`} />
      </div>
    </Card>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-neutral-300 bg-white p-0.5 text-[11px] shadow-sm dark:border-zinc-800 dark:bg-black/80">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-2.5 py-1 transition ${
              active
                ? "bg-neutral-900 text-white dark:bg-zinc-100 dark:text-black"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-neutral-700 shadow-sm dark:border-zinc-800 dark:bg-black/80 dark:text-zinc-300">
      {children}
    </span>
  );
}
