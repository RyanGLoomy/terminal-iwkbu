import { DashboardCardsSkeletonGrid } from "@/components/dashboard/dashboard-card-skeleton";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function RekonsiliasiLoading() {
   return (
      <section className="space-y-6">
         <div className="space-y-5">
            {/* Heading */}
            <div>
               <div className="h-7 w-72 bg-base-200 rounded animate-pulse mb-2" />
               <div className="h-4 w-full max-w-2xl bg-base-200 rounded animate-pulse" />
            </div>

            {/* Summary Cards */}
            <DashboardCardsSkeletonGrid />

            {/* Table */}
            <TableSkeleton rows={5} />
         </div>
      </section>
   );
}
