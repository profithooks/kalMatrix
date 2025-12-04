// src/utils/epicNormalizer.js

/**
 * Normalize a Jira Epic issue into a safe shape for our Epic model.
 * We DO NOT fabricate dates or values – we keep nulls where Jira is missing data.
 * We ALSO return `missingFields` so caller can log / inspect data quality.
 */
export function normalizeJiraEpic(epicIssue) {
  if (!epicIssue) {
    return {
      normalized: {
        externalId: null,
        key: null,
        title: "Untitled epic",
        description: null,
        statusName: null,
        statusCategory: null,
        isDone: false,
        startedAt: null,
        targetDelivery: null,
        assignees: [],
        urlPath: null,
      },
      missingFields: ["issue"],
    };
  }

  const fields = epicIssue.fields || {};
  const missingFields = [];

  const externalId = epicIssue.id || null;
  if (!externalId) missingFields.push("id");

  const key = epicIssue.key || null;
  if (!key) missingFields.push("key");

  const summary =
    typeof fields.summary === "string" && fields.summary.trim().length > 0
      ? fields.summary.trim()
      : null;
  if (!summary) missingFields.push("summary");

  const description =
    typeof fields.description === "string" &&
    fields.description.trim().length > 0
      ? fields.description.trim()
      : null;

  const statusName = fields.status?.name || null;
  if (!statusName) missingFields.push("status.name");

  const statusCategoryKey = fields.status?.statusCategory?.key || null;
  if (!statusCategoryKey) missingFields.push("status.statusCategory.key");

  const isDone = statusCategoryKey === "done";

  // Jira standard field: duedate (string "YYYY-MM-DD")
  let targetDelivery = null;
  if (fields.duedate) {
    const d = new Date(fields.duedate);
    if (!isNaN(d.getTime())) {
      targetDelivery = d;
    } else {
      missingFields.push("duedate_invalid");
    }
  } else {
    missingFields.push("duedate");
  }

  // We do NOT guess start date. Use created if present, else null.
  let startedAt = null;
  if (fields.created) {
    const d = new Date(fields.created);
    if (!isNaN(d.getTime())) {
      startedAt = d;
    } else {
      missingFields.push("created_invalid");
    }
  } else {
    missingFields.push("created");
  }

  // Single assignee (epic owner)
  const assigneeField = fields.assignee || null;
  const assignees = [];
  if (assigneeField) {
    assignees.push({
      accountId: assigneeField.accountId || null,
      displayName: assigneeField.displayName || null,
      email: assigneeField.emailAddress || null,
    });
  } else {
    missingFields.push("assignee");
  }

  // URL path (we'll add baseUrl separately in sync)
  const urlPath = key ? `/browse/${key}` : null;

  return {
    normalized: {
      externalId,
      key,
      title: summary || "Untitled epic",
      description,
      statusName,
      statusCategory: statusCategoryKey,
      isDone,
      startedAt,
      targetDelivery,
      assignees,
      urlPath,
    },
    missingFields,
  };
}
