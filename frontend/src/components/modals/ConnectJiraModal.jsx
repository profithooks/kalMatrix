import Card from "../ui/Card";
import { X } from "lucide-react";
import { useToastStore } from "../../store/toastStore";
import { useJiraOAuthInit } from "../../query/mutations/useJiraOAuthInit";

export default function ConnectJiraModal({ open, onClose }) {
  const { showToast } = useToastStore();
  const jiraOAuthInit = useJiraOAuthInit();

  if (!open) return null;

  const handleConnect = () => {
    jiraOAuthInit.mutate(undefined, {
      onSuccess: (data) => {
        if (!data?.authorizeUrl) {
          showToast({
            type: "error",
            title: "Jira connect failed",
            message: "No authorize URL returned from server.",
          });
          return;
        }
        window.location.href = data.authorizeUrl;
      },
      onError: (err) => {
        console.error("Jira OAuth init error:", err);
        showToast({
          type: "error",
          title: "Jira connect failed",
          message: "Unable to start Jira OAuth flow.",
        });
      },
    });
  };

  const isLoading = jiraOAuthInit.isPending;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6 bg-zinc-900/90 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            Connect Jira Cloud
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-zinc-800 text-zinc-400"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          You&apos;ll be redirected to Atlassian to approve access. KalMatrix will
          read projects, epics, stories, bugs and comments to predict delivery
          risk. No source code contents are stored.
        </p>

        <div className="mt-4 rounded-xl border border-zinc-800 bg-neutral-900 p-3">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            What KalMatrix will read
          </p>
          <ul className="mt-2 list-disc pl-4 text-xs text-zinc-300">
            <li>Project / board metadata</li>
            <li>Epics, stories, tasks, bugs and their status</li>
            <li>Assignees, timestamps, comments, and changelog</li>
          </ul>
        </div>

        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full mt-5 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-medium disabled:opacity-60"
        >
          {isLoading ? "Connecting to Jira…" : "Connect with Jira"}
        </button>
      </Card>
    </div>
  );
}
