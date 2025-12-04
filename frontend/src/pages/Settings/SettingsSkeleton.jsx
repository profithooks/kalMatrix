import Skeleton from "../../components/ui/Skeleton";

export default function SettingsSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="mb-4 h-7 w-44" />
      <Skeleton className="mb-6 h-4 w-72" />

      <Skeleton className="mb-4 h-32 rounded-2xl" />
      <Skeleton className="mb-4 h-32 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}
