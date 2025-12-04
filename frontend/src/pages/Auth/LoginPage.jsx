import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import Card from "../../components/ui/Card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const login = useAuthStore((s) => s.login);
  const showToast = useToastStore((s) => s.showToast);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/radar";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      const { token, user } = res.data || {};
      if (!token || !user) {
        throw new Error("Invalid login response");
      }
      login(token, user);
      showToast({
        type: "success",
        title: "Welcome",
        message: `Logged in as ${user.name || user.email}`,
      });
      navigate(from, { replace: true });
    } catch (err) {
      console.error("login error", err);
      const msg =
        err?.response?.data?.error || "Login failed. Check credentials.";
      showToast({
        type: "error",
        title: "Login failed",
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 text-neutral-900 dark:bg-[#050506] dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        {/* Brand / story side */}
        <div className="mb-8 space-y-5 lg:mb-0 lg:max-w-md">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:text-zinc-500">
            KalMatrix
          </div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-zinc-50 sm:text-[32px]">
            Delivery radar
            <br className="hidden sm:block" />
            <span className="sm:ml-1">for real teams.</span>
          </h1>
          <p className="max-w-md text-sm text-neutral-600 dark:text-zinc-400">
            Predict 2–6 week delivery slippage from Jira, GitHub and CI signals.
            One place to see what will slip before it does.
          </p>

          <p className="pt-4 text-[0.7rem] text-neutral-500 dark:text-zinc-600">
            © {new Date().getFullYear()} KalMatrix. All rights reserved.
          </p>
        </div>

        {/* Auth card side */}
        <div className="w-full max-w-md">
          {/* Mobile header (compact) */}
          <div className="mb-4 block lg:hidden">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:text-zinc-500">
              Sign in
            </p>
            <p className="mt-1 text-xs text-neutral-600 dark:text-zinc-400">
              Use your KalMatrix account to access the radar.
            </p>
          </div>

          <Card className="border border-neutral-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-black/80 sm:p-7">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-zinc-50 sm:text-xl">
              Welcome back
            </h2>
            <p className="mt-1 text-[0.75rem] text-neutral-600 dark:text-zinc-500 sm:text-xs">
              Sign in to see which epics are about to slip.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-700 dark:text-zinc-300">
                  Work email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-zinc-700 dark:bg-black/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-700 dark:text-zinc-300">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-zinc-700 dark:bg-black/70 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 flex h-9 w-full items-center justify-center rounded-xl bg-neutral-900 text-xs font-medium uppercase tracking-[0.16em] text-neutral-50 transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-4 text-[0.75rem] text-neutral-600 dark:text-zinc-500 sm:text-xs">
              Need an account?{" "}
              <Link
                to="/signup"
                className="font-medium text-neutral-900 underline-offset-2 hover:underline dark:text-zinc-100"
              >
                Create one
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
