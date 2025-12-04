// src/prediction/recoveryPlaybook.js

/**
 * Returns a prioritized list of actions for a given slipType + severity.
 * This is V1: Jira-only, no GitHub/Slack.
 */
// src/prediction/recoveryPlaybook.js

// slipType: scope_creep | dependency_blocked | stagnant_work | lead_uncertainty |
// lead_misalignment | no_plan | generic_high_risk | unknown | none
// severity: none | low | moderate | high | critical

export function getRecoveryActions(slipType, severity) {
  const SEVERITY_PREFIX =
    severity === "critical"
      ? "This epic is on fire. Treat it as a top-3 priority for the week."
      : severity === "high"
      ? "This epic will hurt the quarter if you ignore it."
      : severity === "moderate"
      ? "This epic can still be saved with a focused push."
      : severity === "low"
      ? "This epic needs hygiene, not a war room."
      : "Health check only.";

  switch (slipType) {
    case "scope_creep":
      return [
        {
          id: "scope_freeze_new_work",
          owner: "lead",
          priority: 1,
          label: "Freeze scope for this epic",
          description:
            SEVERITY_PREFIX +
            " Stop adding new stories for this epic until the current scope is under control. Move nice-to-have work into a follow-up epic.",
        },
        {
          id: "scope_retriage_board",
          owner: "lead",
          priority: 2,
          label: "Re-triage current stories",
          description:
            "Sit with the PM and mark each story as Must-have / Nice-to-have / Can-wait. De-scope or move out everything that is not Must-have.",
        },
        {
          id: "scope_align_deadline",
          owner: "pm",
          priority: 3,
          label: "Align delivery date with new scope",
          description:
            "Once scope is frozen, reset the target delivery and communicate the new date clearly in Jira and to stakeholders.",
        },
      ];

    case "dependency_blocked":
      return [
        {
          id: "dep_owner_named",
          owner: "pm",
          priority: 1,
          label: "Name a single owner for the dependency",
          description:
            SEVERITY_PREFIX +
            " Assign one person to unblock the dependency. Their only job: get a clear yes/no ETA from the owning team.",
        },
        {
          id: "dep_negotiated_eta",
          owner: "pm",
          priority: 2,
          label: "Negotiate written ETA from owning team",
          description:
            "Log the dependency as a Jira ticket linked to this epic. Get a written ETA or explicit ‘won’t do’ from the other team.",
        },
        {
          id: "dep_plan_b",
          owner: "lead",
          priority: 3,
          label: "Define Plan B if dependency slips again",
          description:
            "Write down what you will cut, mock, or fake if the dependency misses the new ETA. Avoid a second slip for the same reason.",
        },
      ];

    case "stagnant_work":
      return [
        {
          id: "stuck_review_board",
          owner: "lead",
          priority: 1,
          label: "Run a 30-minute ‘stuck stories’ review",
          description:
            SEVERITY_PREFIX +
            " List all stories that haven’t moved in 5+ days. For each one, agree on the next concrete step or explicitly park it.",
        },
        {
          id: "stuck_assign_clear_owner",
          owner: "lead",
          priority: 2,
          label: "Give each stuck story one clear owner",
          description:
            "No shared ownership. Each stuck story should have one person who feels personally responsible for moving it this week.",
        },
        {
          id: "stuck_cut_or_split",
          owner: "lead",
          priority: 3,
          label: "Split or cut stories that are too big",
          description:
            "If a story is stuck because it is vague or huge, split it into smaller, shippable pieces and drop anything not needed for the epic outcome.",
        },
      ];

    case "lead_uncertainty":
      return [
        {
          id: "lead_forced_forecast",
          owner: "lead",
          priority: 1,
          label: "Force a forecast, don’t accept ‘not sure’",
          description:
            SEVERITY_PREFIX +
            " The lead must commit to on-track / 1-3 weeks slip / 3+ weeks slip. Uncertainty is acceptable in comments, not as the main answer.",
        },
        {
          id: "lead_list_unknowns",
          owner: "lead",
          priority: 2,
          label: "List top 3 unknowns blocking a clear forecast",
          description:
            "Write down what you don’t know yet (e.g., estimate for X, dependency on Y). Turn each unknown into a decision or spike ticket.",
        },
        {
          id: "lead_book_review",
          owner: "pm",
          priority: 3,
          label: "Schedule a 20-minute reality check with PM",
          description:
            "Review scope, dates, and capacity together. The output is a single line: ‘We believe this epic will land by <date> if we do X/Y/Z.’",
        },
      ];

    case "lead_misalignment":
      return [
        {
          id: "misalign_compare_signals",
          owner: "pm",
          priority: 1,
          label: "Compare lead story vs. data story",
          description:
            SEVERITY_PREFIX +
            " Open the Delivery Radar together. Walk through why signals say ‘risky’ while the lead says ‘on track’. Align on a single narrative.",
        },
        {
          id: "misalign_set_shared_metric",
          owner: "lead",
          priority: 2,
          label: "Define one hard metric for ‘on track’",
          description:
            "Pick a simple metric (e.g., ‘80% of critical stories done by <date>’). Agree that this is the definition of ‘on track’ for this epic.",
        },
        {
          id: "misalign_update_checkins",
          owner: "lead",
          priority: 3,
          label: "Update weekly check-in based on the metric",
          description:
            "From next week, the weekly status must match the metric. If the metric is off, the status cannot stay ‘on track’.",
        },
      ];

    case "no_plan":
      return [
        {
          id: "plan_break_into_stories",
          owner: "lead",
          priority: 1,
          label: "Break the epic into real stories",
          description:
            SEVERITY_PREFIX +
            " An epic with no stories is not a plan. Create concrete tickets for every meaningful chunk of work.",
        },
        {
          id: "plan_define_minimum_slice",
          owner: "lead",
          priority: 2,
          label: "Define a minimum shippable slice",
          description:
            "Agree what ‘good enough’ looks like for this epic. Anything beyond that goes into a follow-up epic.",
        },
        {
          id: "plan_connect_dates",
          owner: "pm",
          priority: 3,
          label: "Connect scope to dates",
          description:
            "Once stories exist, check if they can realistically fit before the current target date. If not, cut scope or move the date.",
        },
      ];

    case "generic_high_risk":
      return [
        {
          id: "generic_triage",
          owner: "lead",
          priority: 1,
          label: "Run a 20-minute epic triage",
          description:
            SEVERITY_PREFIX +
            " Walk through reasons on the radar. Decide what is actually true and what is noise. Edit the epic description so anyone can understand the risk.",
        },
        {
          id: "generic_pick_two_actions",
          owner: "lead",
          priority: 2,
          label: "Pick two moves that change the outcome this week",
          description:
            "Instead of 10 soft actions, choose 2–3 hard moves (cut scope, unblock dependency, move senior eng) that visibly change the risk in 7 days.",
        },
        {
          id: "generic_communicate_upwards",
          owner: "pm",
          priority: 3,
          label: "Communicate risk and plan upwards",
          description:
            "Send one crisp message to stakeholders: what the risk is, what you are doing about it, and when you’ll know if the plan is working.",
        },
      ];

    case "unknown":
      return [
        {
          id: "unknown_health_check",
          owner: "lead",
          priority: 1,
          label: "Run a quick health check on this epic",
          description:
            SEVERITY_PREFIX +
            " Look at overdue status, stale issues, and missing stories. Fill in the obvious gaps so the radar can classify the risk better.",
        },
      ];

    case "none":
    default:
      return [];
  }
}

export function estimateRecoveryEta({ slipType, severity, band, score }) {
  // Fuzzy ETA – we don’t overfit here; it’s a guidance, not an SLA.
  if (severity === "critical") {
    return { days: 14, label: "≈ 2 weeks with focused effort" };
  }
  if (severity === "high") {
    return { days: 9, label: "≈ 1–2 weeks" };
  }
  if (severity === "moderate") {
    return { days: 7, label: "≈ 1 week" };
  }
  if (severity === "low") {
    return { days: 5, label: "≈ 3–5 days" };
  }

  // No real risk – the plan is mostly hygiene.
  return { days: 3, label: "≈ a couple of days of clean-up" };
}
