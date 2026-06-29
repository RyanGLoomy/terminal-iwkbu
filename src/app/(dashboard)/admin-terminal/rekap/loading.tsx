import { DashboardCardsSkeletonGrid } from "@/components/dashboard/dashboard-card-skeleton";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function RekapLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-5">
        <div>
          <div className="h-7 w-56 bg-base-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-base-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-72 bg-base-200 rounded animate-pulse" />
        <DashboardCardsSkeletonGrid />
        <TableSkeleton rows={8} />
      </div>
    </section>
  );
}
