import React from "react";

function IssueRow({ issue }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs mb-2">
      <div className="flex justify-between mb-1">
        <div className="font-medium text-zinc-100">
          {issue.key} · {issue.title || issue.summary || ""}
        </div>
        <div className="text-[11px] text-zinc-400">
          {issue.type} · {issue.status}
        </div>
      </div>

      {issue.comments && issue.comments.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] text-zinc-500 mb-1">Comments</div>
          <ul className="space-y-1 max-h-32 overflow-y-auto pr-1">
            {issue.comments.map((c) => (
              <li key={c.externalId} className="text-[11px] text-zinc-300">
                <span className="font-medium">
                  {c.author?.displayName || "Unknown"}:
                </span>{" "}
                {typeof c.body === "string" ? c.body : "[rich text]"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {issue.subtasks && issue.subtasks.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] text-zinc-500 mb-1">Sub-tasks</div>
          <ul className="space-y-1">
            {issue.subtasks.map((s) => (
              <li
                key={s.key}
                className="flex justify-between rounded-lg bg-zinc-950/70 px-2 py-1"
              >
                <span className="text-[11px] text-zinc-200">
                  {s.key} · {s.title || s.summary || ""}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {s.type} · {s.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function EpicJiraIssuesSection({ jiraData }) {
  if (!jiraData) return null;

  const { epic, issues = [] } = jiraData;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-100">
          Jira issues for {epic?.key}
        </h2>
        {epic?.url && (
          <a
            href={epic.url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-blue-400 hover:underline"
          >
            Open in Jira
          </a>
        )}
      </div>

      {issues.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-400">
          No issues linked to this epic yet.
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <IssueRow key={issue.key} issue={issue} />
          ))}
        </div>
      )}
    </section>
  );
}
