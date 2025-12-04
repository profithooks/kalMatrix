import Skeleton from "../../components/ui/Skeleton";

export default function IntegrationsSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="mb-4 h-7 w-52" />
      <Skeleton className="mb-6 h-4 w-64" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-40 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
