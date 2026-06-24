import { DashboardCardsSkeletonGrid } from "@/components/dashboard/dashboard-card-skeleton";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function AdminTerminalMasterDataLoading() {
   return (
      <div className="space-y-5">
         <div className="h-7 w-40 animate-pulse rounded bg-muted" />
         <DashboardCardsSkeletonGrid />
         <TableSkeleton rows={5} />
      </div>
   );
}
