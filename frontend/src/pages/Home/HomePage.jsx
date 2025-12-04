// src/pages/Home/HomePage.jsx
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  GitBranch,
  LineChart,
  ShieldHalf,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

const mockEpics = [
  {
    key: "PAY-142",
    title: "Checkout refactor for new pricing",
    risk: "High",
    eta: "Slip risk: 5 weeks",
    signals: ["Commits slowing down", "No weekly check-in", "Scope expanded"],
    bandClass:
      "border-red-500/40 bg-red-950/40 ring-1 ring-red-500/30 text-red-100",
  },
  {
    key: "APP-88",
    title: "Mobile app performance upgrade",
    risk: "Medium",
    eta: "Slip risk: 2–3 weeks",
    signals: ["Open bugs piling up", "Few merged PRs this week"],
    bandClass:
      "border-amber-400/40 bg-amber-950/40 ring-1 ring-amber-400/30 text-amber-100",
  },
  {
    key: "PLAT-21",
    title: "New onboarding experience",
    risk: "Healthy",
    eta: "On track",
    signals: ["Steady commits", "Green CI", "Weekly check-ins on time"],
    bandClass:
      "border-emerald-400/40 bg-emerald-950/40 ring-1 ring-emerald-400/30 text-emerald-100",
  },
];

export default function HomePage() {
  const { token, user } = useAuthStore();
  const isAuthed = !!token;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-neutral-900 text-white">
      {/* Top nav */}
      <header className="border-b border-zinc-800/80 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold tracking-tight sm:text-lg">
              KalMatrix
            </span>
            <span className="hidden text-[0.7rem] uppercase tracking-[0.18em] text-zinc-500 sm:inline">
              Delivery Radar
            </span>
          </div>

          <nav className="flex items-center gap-2 text-xs sm:gap-3">
            <span className="hidden text-[0.7rem] text-zinc-400 md:inline">
              Built for CTOs, EMs and tech leads
            </span>

            {isAuthed ? (
              <>
                {user?.name && (
                  <span className="hidden text-[0.7rem] text-zinc-500 sm:inline">
                    Signed in as{" "}
                    <span className="text-zinc-200">{user.name}</span>
                  </span>
                )}
                <Link
                  to="/radar"
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-black hover:bg-emerald-400"
                >
                  Go to dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-full px-3 py-1.5 text-zinc-300 hover:bg-zinc-900"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-full bg-zinc-50 px-4 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-black hover:bg-white"
                >
                  Start free workspace
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10">
        {/* Hero */}
        <section className="grid gap-8 lg:grid-cols-[1.1fr,1fr] lg:items-center lg:gap-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-zinc-300 sm:text-[0.65rem]">
              <Activity size={14} />
              <span>Delivery Radar for engineering teams</span>
            </div>

            <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              See delivery slippage{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                2–6 weeks
              </span>{" "}
              before it hits customers.
            </h1>

            <p className="mt-4 max-w-xl text-balance text-sm text-zinc-300 sm:text-base">
              KalMatrix sits on top of Jira, GitHub and your CI, watching the
              signals your team doesn&apos;t have time to check. When an epic
              drifts, it tells you <span className="font-medium">where</span>,{" "}
              <span className="font-medium">why</span> and{" "}
              <span className="font-medium">who needs to move</span>.
            </p>

            <div className="mt-6 flex flex-col flex-wrap gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                {isAuthed ? (
                  <>
                    <Link
                      to="/radar"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-black hover:bg-emerald-400 sm:w-auto"
                    >
                      Go to your radar
                      <ArrowRight size={14} />
                    </Link>
                    <Link
                      to="/integrations"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-zinc-200 hover:bg-zinc-900 sm:w-auto"
                    >
                      Manage integrations
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/signup"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-black hover:bg-emerald-400 sm:w-auto"
                    >
                      Start free workspace
                      <ArrowRight size={14} />
                    </Link>
                    <Link
                      to="/login"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 px-5 py-2.5 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-zinc-200 hover:bg-zinc-900 sm:w-auto"
                    >
                      Watch a live radar
                    </Link>
                  </>
                )}
              </div>
              <p className="text-[0.7rem] text-zinc-500 sm:max-w-xs">
                No agents. No 20-widget dashboards. Just one weekly radar that
                tells you what&apos;s about to slip.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 text-[0.7rem] text-zinc-500 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex items-center gap-2">
                <GitBranch size={14} className="text-zinc-400" />
                <span>Plugs into Jira &amp; GitHub in minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldHalf size={14} className="text-zinc-400" />
                <span>Read-only by design · no write access</span>
              </div>
            </div>
          </div>

          {/* Hero radar card */}
          <div className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-[0_0_60px_rgba(16,185,129,0.15)] sm:mt-8 lg:mt-0">
            <div className="flex flex-col gap-3 border-b border-zinc-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.7rem] uppercase tracking-[0.18em] text-zinc-400">
                  Workspace radar
                </p>
                <p className="mt-1 text-sm text-zinc-100">
                  3 epics are at real risk this quarter.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[0.65rem]">
                <div className="flex items-center gap-1 text-emerald-300">
                  <CheckCircle2 size={14} />
                  <span>Healthy</span>
                </div>
                <div className="flex items-center gap-1 text-amber-300">
                  <AlertTriangle size={14} />
                  <span>At risk</span>
                </div>
                <div className="flex items-center gap-1 text-red-300">
                  <Activity size={14} />
                  <span>Red zone</span>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {mockEpics.map((epic) => (
                <div
                  key={epic.key}
                  className={`rounded-2xl border px-3 py-3 text-xs ${epic.bandClass}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-zinc-400">
                        <span className="rounded-full bg-black/40 px-2 py-0.5 font-mono text-[0.7rem]">
                          {epic.key}
                        </span>
                        <span className="truncate">{epic.eta}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-50">
                        {epic.title}
                      </p>
                    </div>
                    <span className="mt-0.5 shrink-0 rounded-full bg-black/50 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.18em]">
                      {epic.risk}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[0.65rem] text-zinc-200">
                    {epic.signals.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-black/40 px-2 py-0.5 text-[0.65rem] text-zinc-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3 text-[0.65rem] text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>Radar looks 2–6 weeks ahead</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-300">
                <LineChart size={14} />
                <span>Prediction accuracy improves as more epics close</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3-column value props */}
        <section className="mt-12 grid gap-4 md:mt-14 md:grid-cols-3">
          <ValueCard
            icon={BarChart3}
            title="One view of real delivery risk"
            body="Stop guessing based on standups. KalMatrix condenses noisy Jira boards into a single radar you can trust."
          />
          <ValueCard
            icon={Clock}
            title="Warning before status turns red"
            body="We read drift in commits, check-ins, and scope so you get 2–6 weeks of advance notice – not 2–6 days."
          />
          <ValueCard
            icon={ShieldHalf}
            title="Built for serious teams"
            body="Read-only integrations, auditable signals, and a weekly trail of why each epic went red or recovered."
          />
        </section>

        {/* How it works + signals */}
        <section className="mt-14 grid gap-10 border-t border-zinc-800/80 pt-10 lg:mt-16 lg:grid-cols-[1.1fr,1fr]">
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-emerald-400">
              How KalMatrix fits in
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              No process re-write. No new ceremonies. Just one radar and a
              weekly check-in.
            </h2>
            <p className="mt-3 max-w-xl text-sm text-zinc-300 sm:text-[0.95rem]">
              Keep your Jira. Keep your GitHub. KalMatrix quietly correlates the
              signals and sends one simple question every week: &quot;Which
              epics are we actually worried about?&quot;
            </p>

            <ol className="mt-6 space-y-4 text-sm text-zinc-200">
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[0.7rem]">
                  1
                </span>
                <div>
                  <p className="font-medium">Connect Jira &amp; GitHub</p>
                  <p className="mt-1 text-zinc-400">
                    OAuth-based, read-only access. No write permissions, no
                    risky automations.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[0.7rem]">
                  2
                </span>
                <div>
                  <p className="font-medium">KalMatrix watches the signals</p>
                  <p className="mt-1 text-zinc-400">
                    Commits, branches, PRs, CI health, overdue epics, check-in
                    gaps – everything you would track manually if you had the
                    time.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[0.7rem]">
                  3
                </span>
                <div>
                  <p className="font-medium">
                    You get a weekly radar &amp; explanation
                  </p>
                  <p className="mt-1 text-zinc-400">
                    Every epic comes with reasons – so your EMs and tech leads
                    can intervene, renegotiate, or cut scope before dates slip
                    in front of customers or execs.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-5 text-sm text-zinc-200">
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-zinc-400">
              Signals we track
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 text-[0.75rem] sm:grid-cols-2">
              <SignalPill label="Epic age &amp; drift" />
              <SignalPill label="Commit velocity &amp; gaps" />
              <SignalPill label="Open vs merged PRs" />
              <SignalPill label="CI pass / fail trend" />
              <SignalPill label="Scope creep &amp; re-opened work" />
              <SignalPill label="Owner / lead check-ins" />
              <SignalPill label="Blocked work items" />
              <SignalPill label="Story points churn" />
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-black/40 p-4 text-[0.75rem]">
              <AlertTriangle className="mt-0.5 text-amber-400" size={16} />
              <p className="text-zinc-300">
                KalMatrix does <span className="font-medium">not</span> try to
                replace your project managers. It gives them a sharper radar so
                they stop getting surprised in steering meetings.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800/80 bg-neutral-950/80 py-5 text-[0.7rem] text-zinc-500">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="leading-relaxed">
            © {new Date().getFullYear()} KalMatrix · Delivery Radar for
            engineering teams
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span>Made for teams who can&apos;t afford surprises.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ValueCard({ icon: Icon, title, body }) {
  return (
    <div className="h-full rounded-3xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
          <Icon size={16} className="text-emerald-300" />
        </div>
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className="mt-3 text-sm text-zinc-300">{body}</p>
    </div>
  );
}

function SignalPill({ label }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-black/40 px-3 py-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      <span>{label}</span>
    </div>
  );
}
