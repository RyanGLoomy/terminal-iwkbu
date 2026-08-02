import { DashboardCardsSkeletonGrid } from "@/components/dashboard/dashboard-card-skeleton";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function PODashboardLoading() {
   return (
      <section className="space-y-6">
         {/* Heading */}
         <div className="flex justify-between items-center">
            <div>
               <div className="h-7 w-56 bg-base-200 rounded skeleton-shimmer mb-2" />
               <div className="h-4 w-64 bg-base-200 rounded skeleton-shimmer" />
            </div>
         </div>

         {/* Stat Cards */}
         <DashboardCardsSkeletonGrid />

         {/* Chart + Summary section */}
         <div className="grid gap-4 lg:grid-cols-2">
            <Card className="skeleton-shimmer">
               <CardContent className="pt-5">
                  <div className="h-4 w-48 bg-base-200 rounded mb-4" />
                  <div className="h-[300px] w-full bg-base-200/50 rounded" />
               </CardContent>
            </Card>
            <Card className="skeleton-shimmer">
               <CardContent className="pt-5">
                  <div className="h-4 w-40 bg-base-200 rounded mb-4" />
                  <div className="space-y-3">
                     <div className="flex items-center justify-between">
                        <div className="h-4 w-32 bg-base-200 rounded" />
                        <div className="h-6 w-12 bg-base-200 rounded" />
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="h-4 w-40 bg-base-200 rounded" />
                        <div className="h-6 w-12 bg-base-200 rounded" />
                     </div>
                     <div className="flex items-center justify-between">
                        <div className="h-4 w-28 bg-base-200 rounded" />
                        <div className="h-6 w-12 bg-base-200 rounded" />
                     </div>
                     <div className="flex items-center justify-between border-t border-base-300 pt-3">
                        <div className="h-4 w-28 bg-base-200 rounded" />
                        <div className="h-7 w-16 bg-base-200 rounded" />
                     </div>
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* Table */}
         <TableSkeleton rows={5} />
      </section>
   );
}
