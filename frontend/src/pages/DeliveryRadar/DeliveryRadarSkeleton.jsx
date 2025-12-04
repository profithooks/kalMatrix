import Skeleton from "../../components/ui/Skeleton";

/**
 * Steve Jobs style skeleton:
 * – calm
 * – balanced spacing
 * – mixed widths for realism
 * – layered depth instead of equal-size blocks
 */
export default function DeliveryRadarSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header area */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-32 rounded" /> {/* DELIVERY RADAR label */}
        <Skeleton className="h-8 w-2/3 rounded" /> {/* Title */}
        <Skeleton className="h-3 w-1/2 rounded" /> {/* Subtitle */}
        <Skeleton className="h-3 w-40 rounded" /> {/* Updated time */}
        {/* KPI Row */}
        <div className="flex gap-10 pt-4">
          <Skeleton className="h-10 w-16 rounded-xl" />
          <Skeleton className="h-10 w-16 rounded-xl" />
          <Skeleton className="h-10 w-16 rounded-xl" />
          <Skeleton className="h-10 w-16 rounded-xl" />
        </div>
      </div>

      {/* Risk Mix Bar */}
      <div className="rounded-2xl border border-zinc-800 p-6 bg-neutral-900/40">
        <Skeleton className="h-3 w-full rounded" />
      </div>

      {/* Filters */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* Table */}
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
