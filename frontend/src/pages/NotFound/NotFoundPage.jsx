import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wide text-zinc-500">404</p>
        <h1 className="text-2xl font-semibold text-white">
          Radar cannot locate this page.
        </h1>
        <p className="text-sm text-zinc-500">
          The path you followed doesn&apos;t map to any epic, team, or view in
          KalMatrix.
        </p>
      </div>

      <Link
        to="/"
        className="mt-2 rounded-full border border-zinc-700 bg-neutral-900 px-4 py-2 text-xs text-zinc-100 hover:bg-zinc-800"
      >
        Go back to Delivery Radar
      </Link>
    </div>
  );
}
