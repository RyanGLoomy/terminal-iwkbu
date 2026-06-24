import { DashboardCardsSkeletonGrid } from "@/components/dashboard/dashboard-card-skeleton";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function AdminTerminalLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-5">
        <div>
          <div className="h-7 w-72 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-muted rounded animate-pulse" />
        </div>
        <DashboardCardsSkeletonGrid />
        <TableSkeleton rows={5} />
      </div>
    </section>
  );
}
