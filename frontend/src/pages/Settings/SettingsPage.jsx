// src/pages/Settings/SettingsPage.jsx
import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import { useWorkspaceSettings } from "../../query/hooks/useWorkspaceSettings";
import { useUpdateWorkspaceSettings } from "../../query/mutations/useUpdateWorkspaceSettings";
import { useAuthStore } from "../../store/authStore";

const WORKING_DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { data, isLoading, isError } = useWorkspaceSettings();
  const updateWorkspace = useUpdateWorkspaceSettings();

  // Local editable org state, seeded from API
  const [org, setOrg] = useState({
    name: "",
    timezone: "Asia/Kolkata",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    horizon: "2-6",
  });

  // User UI state (front-end only for now)
  const [profile, setProfile] = useState({
    name: user?.name || "Trust The LION",
    email: user?.email || "naved@example.com",
  });

  const [apiKey] = useState("hamza_live_1234_XXXX_XXXX");

  // Hydrate org state when workspace data arrives
  useEffect(() => {
    if (!data) return;

    setOrg((prev) => ({
      ...prev,
      name: data.name || prev.name,
      timezone: data.timezone || prev.timezone,
      workingDays:
        Array.isArray(data.workingDays) && data.workingDays.length > 0
          ? data.workingDays
          : prev.workingDays,
      horizon: data.horizon || prev.horizon, // "2-6" | "4-8"
    }));
  }, [data]);

  const toggleWorkingDay = (day) => {
    setOrg((prev) => {
      const exists = prev.workingDays.includes(day);
      return {
        ...prev,
        workingDays: exists
          ? prev.workingDays.filter((d) => d !== day)
          : [...prev.workingDays, day],
      };
    });
  };

  const handleOrgChange = (field, value) => {
    setOrg((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const copyApiKey = () => {
    navigator.clipboard?.writeText(apiKey).catch(() => {});
  };

  const handleSaveWorkspace = () => {
    // IMPORTANT: we don't need data.id for /workspaces/me
    if (updateWorkspace.isPending) return;

    updateWorkspace.mutate({
      name: org.name,
      timezone: org.timezone,
      workingDays: org.workingDays,
      horizon: org.horizon,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-full w-full bg-white text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <p className="text-xs text-neutral-500 dark:text-zinc-400">
            Loading workspace settings…
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-full w-full bg-white text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <p className="text-xs text-red-500">
            Failed to load workspace settings. Please refresh.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-white text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          {/* <p className="text-xs uppercase tracking-[0.22em] text-neutral-500 dark:text-zinc-400">
            Settings
          </p> */}
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            Workspace settings
          </h1>
          <p className="text-sm text-neutral-600 dark:text-zinc-400">
            Configure how KalMatrix predicts delivery risk for your org.
          </p>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Org settings */}
          <Card className="border border-neutral-200 bg-white px-5 py-5 shadow-sm dark:border-zinc-900 dark:bg-black/80 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  Organization
                </h2>
                <p className="mt-1 text-xs text-neutral-600 dark:text-zinc-400">
                  Basic settings that affect every prediction and view.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveWorkspace}
                disabled={updateWorkspace.isPending}
                className="h-9 rounded-full border border-neutral-300 bg-neutral-900 px-4 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
              >
                {updateWorkspace.isPending ? "Saving…" : "Save changes"}
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-xs text-neutral-600 dark:text-zinc-400">
                  Organization name
                </label>
                <input
                  type="text"
                  className="mt-1 h-9 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-zinc-800 dark:bg-neutral-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-zinc-500"
                  value={org.name}
                  onChange={(e) => handleOrgChange("name", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs text-neutral-600 dark:text-zinc-400">
                    Timezone
                  </label>
                  <select
                    className="mt-1 h-9 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-zinc-800 dark:bg-neutral-900 dark:text-zinc-100 dark:focus:border-zinc-500"
                    value={org.timezone}
                    onChange={(e) =>
                      handleOrgChange("timezone", e.target.value)
                    }
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-neutral-600 dark:text-zinc-400">
                    Prediction horizon
                  </label>
                  <select
                    className="mt-1 h-9 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-zinc-800 dark:bg-neutral-900 dark:text-zinc-100 dark:focus:border-zinc-500"
                    value={org.horizon}
                    onChange={(e) => handleOrgChange("horizon", e.target.value)}
                  >
                    <option value="2-6">2–6 weeks (default)</option>
                    <option value="4-8">4–8 weeks</option>
                  </select>
                  <p className="mt-1 text-[11px] text-neutral-500 dark:text-zinc-400">
                    Defines how far ahead KalMatrix attempts to predict slippage.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-600 dark:text-zinc-400">
                  Working days
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WORKING_DAY_OPTIONS.map((day) => {
                    const active = org.workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day)}
                        className={`rounded-full px-3 py-1 text-xs border transition ${
                          active
                            ? "border-neutral-900 bg-neutral-900 text-white dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-50"
                            : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-zinc-800 dark:bg-neutral-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-neutral-500 dark:text-zinc-400">
                  Used when computing capacity-aware predictions.
                </p>
              </div>
            </div>
          </Card>

          {/* User settings (local only for now) */}
          <Card className="border border-neutral-200 bg-white px-5 py-5 shadow-sm dark:border-zinc-900 dark:bg-black/80">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Your profile
            </h2>
            <p className="mt-1 text-xs text-neutral-600 dark:text-zinc-400">
              These settings are local to your user (display only in MVP).
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-800 dark:bg-zinc-800 dark:text-zinc-100">
                {profile.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-neutral-900 dark:text-zinc-100">
                  {profile.name}
                </p>
                <p className="text-xs text-neutral-600 dark:text-zinc-400">
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-xs text-neutral-600 dark:text-zinc-400">
                  Name
                </label>
                <input
                  type="text"
                  className="mt-1 h-9 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-zinc-800 dark:bg-neutral-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-zinc-500"
                  value={profile.name}
                  onChange={(e) => handleProfileChange("name", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-600 dark:text-zinc-400">
                  Email
                </label>
                <input
                  type="email"
                  className="mt-1 h-9 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-zinc-800 dark:bg-neutral-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-zinc-500"
                  value={profile.email}
                  onChange={(e) => handleProfileChange("email", e.target.value)}
                />
              </div>
            </div>

            <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-zinc-800">
              <p className="text-xs text-neutral-600 dark:text-zinc-400">
                Theme (preview)
              </p>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-zinc-400">
                Use the toggle in the top bar to switch between light and dark
                for this workspace.
              </p>
            </div>
          </Card>
        </div>

        {/* API Keys */}
        <Card className="border border-neutral-200 bg-white px-5 py-5 shadow-sm dark:border-zinc-900 dark:bg-black/80">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
            API access
          </h2>
          <p className="mt-1 text-xs text-neutral-600 dark:text-zinc-400">
            Read-only preview of how KalMatrix&apos;s API keys will look in a real
            environment.
          </p>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <p className="text-xs text-neutral-600 dark:text-zinc-400">
                Primary API key
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="inline-flex max-w-full flex-1 truncate rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-800 dark:border-zinc-800 dark:bg-neutral-900 dark:text-zinc-100">
                  {apiKey}
                </code>
                <button
                  type="button"
                  onClick={copyApiKey}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-neutral-100 dark:border-zinc-700 dark:bg-neutral-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Copy
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="mt-3 h-9 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs text-neutral-500 md:mt-0 dark:border-zinc-800 dark:bg-neutral-900 dark:text-zinc-400"
            >
              Regenerate (disabled in demo)
            </button>
          </div>

          <p className="mt-2 text-[11px] text-neutral-500 dark:text-zinc-400">
            In production, these keys would allow you to pull KalMatrix&apos;s risk
            predictions into internal dashboards or governance tools.
          </p>
        </Card>
      </div>
    </div>
  );
}
