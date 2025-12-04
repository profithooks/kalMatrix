# Hamza API – Delivery Radar Backend

Hamza is a **delivery-risk radar** for software teams.  
This service ingests work from Jira, Azure Boards and GitHub, computes daily signals, and produces a **2–6 week delivery risk prediction per epic**.

---

## Core Value

- Connect one or more workspaces to Jira / Azure / GitHub
- Pull epics + issues + activity
- Compute **daily signals** (movement, WIP, bugs, check-ins)
- Generate **risk snapshots** per epic:
  - `riskLevel` = `on_track | at_risk | critical`
  - `probability` = numeric risk score
  - `reasons` = human-readable explanation list

This API powers the Hamza web UI and can be embedded into partner tools.

---

## Tech Stack

- **Runtime:** Node.js, Express
- **Database:** MongoDB + Mongoose
- **Job System:** Mongo-backed `Job` model + worker poller
- **Integrations:**
  - Jira (OAuth)
  - Azure Boards (PAT)
  - GitHub (token)
- **Prediction Engine:**
  - `evaluateEpicSignals` + `dailySignalEngine` + `dailyPredictionEngine`

---

## High-Level Architecture

- `src/server.js` – Express app, security, rate limiting, routing
- `src/routes/*` – HTTP route definitions
- `src/controllers/*` – Request/response orchestration
- `src/services/*` – Business logic:
  - `jiraService`, `azureBoardsService`, `githubService`
  - `dailySignalEngine`, `dailyPredictionEngine`
  - `predictionService` (`rebuildPredictionsForWorkspace`)
- `src/prediction/*` – Signal definitions and risk evaluation
- `src/models/*` – Mongoose models (`Epic`, `Workspace`, `Integration`, `Job`, `DailyEpicSignal`, `PredictionSnapshot`, `EpicOutcome`, etc.)
- `src/jobs/*` – Job runner + worker
- `src/utils/logger.js` – Structured JSON logging

---

## Key Flows

### 1. Workspace + Integration

1. User signs up / logs in → gets JWT (workspace-scoped).
2. User connects Jira/Azure/GitHub via `/integrations` routes.
3. `Integration` document created:
   - `workspaceId`
   - `type` (`jira | azure | github`)
   - `meta` (encrypted tokens, config, cloud/project IDs)

### 2. Sync & Prediction Pipeline

Triggered either:

- Manually: “Sync / Rebuild predictions” button in UI
- Automatically: cron job for all workspaces

Pipeline:

1. **Sync:**  
   `rebuildPredictionsForWorkspace(workspaceId)`:

   - `syncGithubReposForWorkspace`
   - `syncJiraEpicsForWorkspace`
   - `syncAzureEpicsForWorkspace`

2. **Signals:**  
   `generateDailySignals(workspaceId)`:

   - Aggregate issues, movement, WIP, bugs into `DailyEpicSignal` per epic.

3. **Predictions:**  
   `generateDailyPredictions(workspaceId)`:
   - Load epics, issues, daily signals, weekly check-ins
   - Run `evaluateEpicSignals`
   - Persist `PredictionSnapshot` per epic

Returns summary:

```json
{
  "ok": true,
  "totalEpics": 42,
  "updatedSnapshots": 38,
  "statuses": {
    "githubSynced": true,
    "jiraSynced": true,
    "azureSynced": false
  }
}
```
