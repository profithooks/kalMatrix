Total Signals Used: 51


1. Status & Staleness Signals — 7 signals

1- Days since last epic status change

2- Days since last issue moved to in_progress

3- Days since last issue moved to done

4- Days since last new issue created

5- Days since last reopened issue

6- Days since any field changed (global staleness)

7- Inactivity flag (boolean staleness)

2. Issue Flow Signals — 6 signals

1- Count of open issues

2- Count of in_progress issues

3- Count of done issues

4- WIP ratio (in_progress / total)

5- Done ratio (done / total)

6- Flow imbalance score

3. Throughput Signals — 5 signals

1- Done issues last 7 days

2- Done issues last 14 days

3- Throughput trend (up/down)

4- Throughput vs remaining work

5- Idle throughput flag

4. Story Point & Scope Signals — 10 signals

1- Total story points

2- Completed story points

3- Remaining story points

4- % completed

5- Points added today

6- Points removed today

7- Points added last 7 days

8- Points added last 14 days

9- Scope creep percentage

10- Scope spike flag

5. Cycle Time & Lead Time Signals — 6 signals

1- Median cycle time (recent)

2- Cycle time trend

3- Median lead time

4- Lead time trend

5- Reopened-count trend

6- Resolved/closed issue age trend

6. Deadline & Date Signals — 4 signals

1- Days to due date

2- Work vs remaining time mismatch

3- Unbounded epic (no due date but large scope)

4- Expected vs actual burndown divergence

7. Weekly Check-In (Human) Signals — 5 signals

1- Last check-in status (on_track/slip_1_3/slip_3_plus)

2- No check-in penalty

3- Check-in trend (improving/worsening)

4- Reason keywords (blocker/dependency/etc.)

5- Confidence boost when human + machine match

8. Team & Assignee Reliability Signals — 5 signals

1- Team on-time delivery rate

2- Assignee slip frequency

3- Team load (active risky epics per team)

4- Assignee throughput trend

5- Historical pattern matching (similar past epics)

9. Metadata & Context Signals — 4 signals

1- Epic size (issue count)

2- Label risk patterns (urgent/migration/platform)

3- Project reliability profile

4-Final Output After Combining 51 Signals:


// This is how we build it
riskScore (0–100)

riskBand (green/amber/red)

riskLevel (healthy/at_risk/off_track)

confidenceScore

reasons[] (top 3–5 contributing signals)
