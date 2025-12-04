KalMatrix Delivery Radar – Backend Architecture (v40, P0 moat)

This document describes the current backend architecture for the KalMatrix Delivery Radar backend, with the new P0 moat logic wired in.

1. High-level overview

Core idea:

Pull execution data from tools like Jira.

Build a “Delivery Genome” per epic (trend/time-series of signals).

Predict 2–6 week delivery risk.

Track how accurate we are over time.

Expose clean APIs for the Radar and dashboard UI.

Main components:

API server (Express + Node)

Worker process (job runner + scheduled tasks)

MongoDB (primary data store)

External systems:

Jira (currently primary)

GitHub (service stub exists, can be wired next)

2. Runtime components
2.1 API Server

Entry:

src/server.js

Responsibilities:

load env + connect Mongo (config/db.js)

apply middlewares: cors, helmet, rateLimit, requestLogger, authMiddleware, errorHandler

mount all routes under /api:

/auth

/workspaces

/integrations

/integrations/status

/integrations/:id/sync

/epics

/epics/risk

/teams/risk

/stats/*

/weekly-checkins

/jira/*

/dev/* (behind debug guard)

This process is stateless; all state is in MongoDB and external tools.

2.2 Worker process

Entry:

src/worker.js

Responsibilities:

Connect to Mongo.

Start:

startJobRunner() from src/jobs/jobRunner.js:

continuously process Job documents (currently prediction_rebuild).

Any cron-like scheduled jobs:

e.g. nightly prediction rebuild per workspace,

future reconnection/self-healing tasks.

Worker and API can be separate processes/containers and scale independently.

3. Domain model

Key collections (Mongoose models):

3.1 Workspace

File: src/models/Workspace.js

Fields (relevant):

name

timezone

workingDays

predictionWindowWeeks – currently 1–6, default 6.

lastPredictionRebuildAt – when predictions were last fully recomputed.

Timestamps.

Acts as the tenant boundary; most queries are scoped by workspaceId.

3.2 Integration

File: src/models/Integration.js

Represents connection to external tools (e.g. Jira):

workspaceId

provider ("jira", "github", etc.)

settings (instance URL, project keys, board filters)

encrypted tokens (using secretCrypto)

operational flags and timestamps:

last sync time

last sync error (if any)

3.3 Epic

File: src/models/Epic.js

Represents a program increment/epic from Jira:

workspaceId

source IDs:

integrationId

Jira key, issueId

metadata:

summary/title

status + normalized status (todo / in_progress / done)

assignee, team, labels, project

target dates / due dates

statusHistory:

array of { status, category, from, to } for cycle-time analysis

derived prediction fields:

latest risk score / band / level

confidence

ETA window label

(linked outcome if done)

We avoid doing heavy joins at read time by denormalizing the “latest prediction” onto the epic itself, while still writing chronological snapshots for accuracy analysis.

3.4 DailyEpicSignal (Delivery Genome)

File: src/models/DailyEpicSignal.js

One row per epic per day capturing “delivery signals”:

epicId

workspaceId

date (bucket)

metrics:

issue counts by status

story point totals (total/completed)

scope change: points added/removed today

cycle time statistics

creation counts, staleness flags

other behaviour used by the risk engine

This is the core of the Delivery Genome moat: a time-series of how work is actually flowing through the system.

3.5 PredictionSnapshot

File: src/models/PredictionSnapshot.js

A frozen prediction row at a specific moment:

workspaceId

epicId

createdAt – explicit timestamp of prediction run

prediction output:

riskScore (0–100)

riskBand (e.g. red_zone, amber, green)

riskLevel (off_track / at_risk / healthy)

confidenceScore

predictedOutcomeBand / ETA window label

compressed summary of signals if needed

Indexes:

(workspaceId, epicId, createdAt desc) for “latest before X” queries.

Used for:

showing history of predictions

computing accuracy vs EpicOutcome.

3.6 EpicOutcome

File: src/models/EpicOutcome.js

Stores the real outcome of an epic once it’s finished:

workspaceId

epicId

closedAt

outcomeBand:

on_time

slip_1_3

slip_3_plus

optional metadata (scope change, blockers, etc.)

This is the ground truth for evaluating predictions.

3.7 EpicWeeklyCheckin

File: src/models/EpicWeeklyCheckin.js

One row per epic per week representing the lead’s own view:

workspaceId

epicId

weekStart (Monday of that week)

status:

on_track

slip_1_3

slip_3_plus

reason

createdByUserId

Weekly check-ins act as a structured human signal and are blended into risk scoring.

3.8 AssigneeMetrics

File: src/models/AssigneeMetrics.js

Aggregated metrics per assignee over windows:

workspaceId

assigneeKey / id

snapshots of:

stories / bugs completed

cycle times

reopened counts

epics owned/on-time/late

Used to generate team and assignee reliability views and to support future ML features.

3.9 Job

File: src/models/Job.js

Represents background tasks:

type (currently "prediction_rebuild")

workspaceId

status: queued | in_progress | completed | failed

payload (future use)

timestamps:

createdAt, startedAt, finishedAt

durationMs

error (message + stack when failed)

Job rows are processed by the worker.

4. Prediction engine & P0 moat

The prediction logic is implemented mainly in:

src/services/predictionService.js

src/services/epicRiskService.js

src/prediction/* (helper modules).

At a high level:

Inputs:

latest Epic data (status, assignee, dates)

recent DailyEpicSignal (Delivery Genome time-series)

EpicWeeklyCheckin (lead answers)

historical patterns via EpicOutcome / AssigneeMetrics (as they grow).

Feature engineering:

staleness (days since last movement)

flow ratios (in-progress vs done)

scope churn (points added/removed vs total)

throughput and cycle time windows

weekly check-in mapped to a risk prior

Scoring:

combine these signals into a riskScore between 0 and 100.

classify into riskBand (e.g. red_zone, amber, green).

map to riskLevel for UI:

off_track (red)

at_risk (amber)

healthy (green)

Recovery guidance:

epicRiskService uses recoveryPlaybook to map signals to suggested actions and ETAs.

This is what feeds “what should I do this week?” in UI.

Persistence:

write PredictionSnapshot per epic.

update “latest” prediction fields on Epic.

This block is the core of the P0 moat: the Delivery Genome + scoring + recovery recommendations.

5. Prediction accuracy engine

File:

src/services/predictionAccuracyService.js

Concept:

For each epic that has an EpicOutcome, find the prediction snapshot made just before it was closed and compare.

Steps:

For workspaceId:

load all EpicOutcome.

for each:

find latest PredictionSnapshot with createdAt <= closedAt.

Classify each pair:

predicted delayed? (based on riskLevel)

actually delayed? (based on outcomeBand)

Aggregate:

TP, FP, TN, FN

accuracy, precision, recall

representative examples list.

This data is returned to the UI as the “confidence/accuracy story” and is included in workspace health.

6. Job system & worker

Files:

src/models/Job.js

src/services/jobService.js

src/jobs/jobRunner.js

src/worker.js

Flow:

API or cron creates a job:

createPredictionRebuildJob(workspaceId) writes a Job row with status: "queued".

Worker process:

polls for queued jobs.

processes them sequentially (or with limited concurrency).

wraps execution with timing and error handling.

On success:

marks job completed, sets durationMs.

On failure:

marks job failed, stores error details.

Design goals:

decouple heavy rebuild work from API latency.

allow future job types:

backfill historical data,

integration repair,

ML training.

7. Integrations layer

Files:

src/services/jiraClient.js

src/services/jiraService.js

src/services/jiraSyncService.js

src/controllers/jiraOAuthController.js

src/controllers/IntegrationController.js

src/routes/integrationRoutes.js

src/routes/integrationSyncRoutes.js

src/routes/jiraOAuthRoutes.js

Responsibilities:

jiraClient:

low-level HTTP client to Jira with auth.

jiraService:

higher-level operations:

fetch epics, issues, board items.

jiraSyncService:

orchestrates full workspace sync:

fetch → normalize → upsert epics/issues → update daily signals.

IntegrationController:

list integrations for workspace.

connect integration (Jira OAuth attach).

jiraOAuthController:

handles OAuth handshake start/callback.

This layer is isolated so we can add GitHub and other systems with the same pattern.

8. API surface (summary)

Main route groups:

/auth

login, signup, token refresh.

/workspaces

GET /me

PATCH /me

GET /me/status

PUT /:id/prediction-window (can be normalized to /me/prediction-window later).

/integrations

GET / – list integrations

GET /status – health / status summary

POST /:integrationId/sync – manual sync

/epics

GET / – list epics with latest prediction

GET /:id – detailed epic view

GET /risk – workspace risk breakdown

/teams

GET /risk – team and assignee risk summary

/weekly-checkins

CRUD for weekly lead check-ins per epic

/stats

prediction accuracy and related stats

/jira/*

OAuth and debug endpoints

Most routes are protected by authMiddleware and derive workspaceId from req.user.

9. P0 moats and where they live in code

Delivery Genome

Model: DailyEpicSignal

Services: jiraSyncService, epicRiskService, predictionService

Purpose: time-series view of execution behaviour per epic.

Confidence / Accuracy Engine

Models: PredictionSnapshot, EpicOutcome

Service: predictionAccuracyService

Purpose: quantify how often we correctly warned about delays.

Weekly Accountability

Model: EpicWeeklyCheckin

Service: weeklyCheckinService, integrated in epicRiskService

Purpose: blend human weekly signals into the risk engine and force teams to look at the Radar once a week.

Job / Rebuild Engine

Models: Job, Workspace

Services: jobService, jobRunner, worker

Purpose: keep predictions fresh without blocking UI; foundation for future self-healing integrations.