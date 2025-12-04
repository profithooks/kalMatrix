KalMatrix Delivery Radar – Flow Read

High-level: one workspace connects Jira → we ingest epics/issues daily → we compute signals and predictions → we track how often we were right → we surface risk to UI via a small set of read APIs.

This file explains the main flows.

1. Workspace + user context

Every request after login carries req.user with:

id

workspaceId

Almost all “core” endpoints assume req.user.workspaceId is present and valid.

Workspace holds configuration for predictions:

timezone

predictionWindowWeeks

lastPredictionRebuildAt

Key API:

GET /api/workspaces/me

PATCH /api/workspaces/me – update settings (timezone, working days, prediction window, etc.).

GET /api/workspaces/me/status – high-level health snapshot (integrations, prediction freshness, coverage, accuracy, team health).

2. Connecting Jira (integrations flow)

User starts Jira OAuth from UI:

Calls POST /api/jira/oauth/start (routes: jiraOAuthRoutes).

Backend builds Jira auth URL and redirects.

Jira redirects back to our callback:

GET /api/jira/oauth/callback

We exchange code for tokens and store an Integration document:

workspaceId

provider: "jira"

settings (base URL, cloud/server flags, etc.)

encrypted access/refresh tokens.

UI gets list of integrations:

GET /api/integrations

Returns integrations for req.user.workspaceId (via IntegrationController).

Integration health/status:

GET /api/integrations/status

Uses Integration, recent sync timestamps, and errors to show:

connected / disconnected

last sync time

next actions.

In short: integrations = how we know where to pull data from; one workspace can have multiple integrations but the primary flow is Jira.

3. Manual sync flow (from UI “Sync now”)

Trigger:

POST /api/integrations/:integrationId/sync

Routes: integrationSyncRoutes

Uses jiraSyncService (and jiraService / jiraClient under the hood).

Steps (simplified):

Validate:

User is authenticated.

Integration belongs to req.user.workspaceId.

Fetch epics + issues from Jira:

Use Jira APIs with stored tokens.

Normalize into our internal shape using epicNormalizer.

Upsert Epic documents:

One Epic per Jira epic for that workspace.

Maintain:

key, title, status, assignee, team, labels, etc.

status history (for cycle time/lead time).

target dates and derived ETA windows.

Upsert Issue documents (if needed by the current logic).

Update DailyEpicSignal for that day:

Aggregated metrics per epic:

open / in-progress / done issues

story points totals

story points added/removed today

cycle time stats

“staleness” metrics

This is our “Delivery Genome” row for that day per epic.

Schedule a prediction rebuild job (P0 moat):

Call createPredictionRebuildJob(workspaceId) from jobService.

This writes a Job document:

type: "prediction_rebuild"

workspaceId

status: "queued"

Result: data is fresh and there is a queued job to recompute predictions based on the latest state.

4. Background prediction job (P0 moat core)

There is a separate worker process:

Entry: src/worker.js

Starts:

DB connection

startJobRunner() from src/jobs/jobRunner.js

Optional cron tasks (e.g. daily rebuild).

4.1 Job runner loop

jobRunner roughly does:

Poll Job collection for:

status: "queued"

type: "prediction_rebuild"

Mark job as in_progress, set startedAt.

Call prediction service:

predictionService.rebuildPredictionsForWorkspace(workspaceId)

On success:

Mark job status: "completed", set finishedAt, durationMs.

On error:

Mark job status: "failed", store error.message + error.stack.

If worker is not running, jobs will stay queued and predictions won’t refresh. Running the worker is mandatory in any real environment.

4.2 Prediction rebuild internals

Inside predictionService (and epicRiskService):

Load all epics for the workspace.

Load recent DailyEpicSignal rows for each epic.

Load EpicWeeklyCheckin rows (lead answers).

Combine into a “Delivery Genome” view:

Staleness (no commits/issues moved, no done items).

Flow (open vs in-progress vs done).

Throughput (stories/bugs completed in window).

Scope churn (points added / removed).

Cycle time trends.

Lead’s weekly check-in status (on_track, slip_1_3, slip_3_plus).

For each epic, compute:

riskScore (0–100)

riskBand (e.g. red_zone, amber, green)

riskLevel for UI (off_track, at_risk, healthy)

confidenceScore (how strong is the signal)

etaWindowLabel (2–6 week slip window)

reasons[] – human readable bullet-points

optional recoveryActions from recoveryPlaybook (what to do now).

Write a PredictionSnapshot for each epic:

workspaceId, epicId, createdAt

risk fields (riskScore, riskLevel, riskBand, etc.)

summary metrics used later for accuracy.

Update the Epic document with “latest” fields needed by read APIs:

last risk band, last confidence, last ETA window, etc.

link to latest outcome if epic is done.

Update Workspace.lastPredictionRebuildAt = now.

Result: after each rebuild, we have a complete “frozen” set of predictions at that timestamp (snapshots) plus “current” fields directly on each epic for fast reads.

5. Weekly check-ins flow (lead accountability moat)

Key pieces:

Model: EpicWeeklyCheckin

Routes: weeklyCheckinRoutes

Service: weeklyCheckinService

Flow:

UI renders weekly check-in form for open epics.

Lead submits:

status: on_track | slip_1_3 | slip_3_plus

reason (text)

Backend writes an EpicWeeklyCheckin row (one per epic per week).

During prediction rebuild, lead answers are mapped to a risk contribution:

slip_3_plus → high risk score offset,

slip_1_3 → medium / high,

on_track → lower base risk,

no answer → “unknown” but with a slight penalty.

This is part of the P0 moat: we blend human weekly signals with machine trend signals to create a richer Delivery Genome.

6. Prediction accuracy flow (confidence moat)

Models:

PredictionSnapshot

EpicOutcome (actual outcome for each epic).

Service:

predictionAccuracyService.getPredictionAccuracyForWorkspace(workspaceId)

Flow:

For each EpicOutcome:

Find the latest PredictionSnapshot taken before the epic closed.

Classify:

prediction: delayed vs on_time (riskLevel mapping).

actual: delayed vs on_time (outcomeBand mapping).

Compute across all labelled epics:

TP, FP, TN, FN

accuracy

precision

recall

Expose through stats/controller:

e.g. GET /api/stats/predictions/accuracy or included in workspace status.

This gives the “we caught X% of delays” story and is central to the “confidence engine” moat.

7. Team and workspace risk flows
7.1 Team risk (per team/assignee lens)

Controller:

teamController.getTeamsRisk

Uses:

Epic, PredictionSnapshot, EpicOutcome, AssigneeMetrics.

Flow:

For each epic and its latest prediction:

Attribute risk and outcomes to team or assignee.

Aggregate metrics per team:

number of epics

average risk score

count of epics in red/amber/green

historic slip patterns.

API:

GET /api/teams/risk

This powers the UI for “which teams are risky” and “where to focus this week”.

7.2 Workspace status

Controller:

WorkspaceController.getMyWorkspaceStatus

Combines:

Integration connectivity and last sync timestamps.

Prediction freshness (lastPredictionRebuildAt).

Prediction accuracy summary.

High-level counts of risky vs healthy epics.

Team performance summary via epicRiskService.

API:

GET /api/workspaces/me/status

This is what the dashboard header / health widgets read from.

8. Main read APIs the UI should use

For the v40 backend, the “happy path” reads are:

GET /api/epics

Paginated list of epics for current workspace.

Includes latest risk, confidence, signals, ETA windows.

GET /api/epics/:id

Detailed view of a single epic: history, daily signals, snapshots, weekly check-ins, recovery actions.

GET /api/epics/risk

Workspace-level breakdown:

counts of epics per risk band

key aggregates for the Radar view.

GET /api/teams/risk

Team-level risk summary.

GET /api/workspaces/me

GET /api/workspaces/me/status

Workspace config + health view.

GET /api/integrations / GET /api/integrations/status

Integrations list + health.

GET /api/stats/predictions/accuracy (or equivalent)

Prediction accuracy metrics for the workspace.

Note: older endpoints like GET /workspaces/:workspaceId/epics/risk are effectively legacy; the UI should standardize on the “current workspace” versions without explicit workspace in URL.

9. Error handling and logging

Every controller uses try/catch and returns:

{ ok: false, error: "message" } with proper HTTP status.

requestLogger middleware logs requests in a structured way.

logger (logInfo, logError) wraps pino and should be used instead of console.log in controllers/services.

In production: run API + worker, make sure logs are centralised, and jobs are not silently stuck in queued or failed.