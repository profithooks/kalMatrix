import Skeleton from "../../components/ui/Skeleton";

export default function TeamsSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="h-6 w-40 mb-4" />
      <Skeleton className="h-4 w-56 mb-6" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
