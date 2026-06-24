import { Card, CardContent } from "@/components/ui/card";
import { DashboardCardsSkeletonGrid } from "@/components/dashboard/dashboard-card-skeleton";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function StafIWDashboardLoading() {
   return (
      <section className="space-y-6">
         <div className="space-y-5">
            {/* Header */}
            <div>
               <div className="h-7 w-96 bg-muted rounded animate-pulse mb-2" />
               <div className="h-4 w-full max-w-2xl bg-muted rounded animate-pulse" />
            </div>

            {/* Dashboard Cards */}
            <DashboardCardsSkeletonGrid />

            {/* Workflow Card */}
            <Card className="border-border animate-pulse">
               <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-5">
                  <div className="flex-1">
                     <div className="h-5 w-32 bg-muted rounded mb-2" />
                     <div className="h-4 w-full max-w-lg bg-muted rounded" />
                  </div>
                  <div className="flex gap-2">
                     <div className="h-9 w-32 bg-muted rounded" />
                     <div className="h-9 w-28 bg-muted rounded" />
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* Tabs Skeleton */}
         <div className="space-y-4">
            <div className="h-10 w-full max-w-[640px] bg-muted rounded animate-pulse" />
            <TableSkeleton rows={6} />
         </div>
      </section>
   );
}
