import { Card, CardContent } from "@/components/ui/card";
import { DashboardCardsSkeletonGrid } from "@/components/dashboard/dashboard-card-skeleton";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function StafIWDashboardLoading() {
   return (
      <section className="space-y-6">
         <div className="space-y-5">
            {/* Header */}
            <div>
               <div className="h-7 w-96 bg-base-200 rounded skeleton-shimmer mb-2" />
               <div className="h-4 w-full max-w-2xl bg-base-200 rounded skeleton-shimmer" />
            </div>

            {/* Dashboard Cards */}
            <DashboardCardsSkeletonGrid />

            {/* Analytics & Tren section */}
            <div>
               <div className="h-4 w-40 bg-base-200 rounded skeleton-shimmer mb-3" />
               <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="skeleton-shimmer">
                     <CardContent className="pt-5">
                        <div className="h-4 w-48 bg-base-200 rounded mb-4" />
                        <div className="h-[240px] w-full bg-base-200/50 rounded" />
                     </CardContent>
                  </Card>
                  <Card className="skeleton-shimmer">
                     <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-4">
                           <div className="h-4 w-56 bg-base-200 rounded" />
                           <div className="h-7 w-12 bg-base-200 rounded" />
                        </div>
                        <div className="h-[200px] w-full bg-base-200/50 rounded" />
                     </CardContent>
                  </Card>
               </div>
               <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <Card className="lg:col-span-2 skeleton-shimmer">
                     <CardContent className="pt-5">
                        <div className="h-4 w-48 bg-base-200 rounded mb-4" />
                        <div className="h-[180px] w-full bg-base-200/50 rounded" />
                     </CardContent>
                  </Card>
                  <Card className="skeleton-shimmer">
                     <CardContent className="pt-5">
                        <div className="h-4 w-48 bg-base-200 rounded mb-4" />
                        <div className="h-[180px] w-full bg-base-200/50 rounded" />
                     </CardContent>
                  </Card>
               </div>
               <div className="mt-4">
                  <Card className="skeleton-shimmer">
                     <CardContent className="pt-5">
                        <div className="h-4 w-56 bg-base-200 rounded mb-4" />
                        <div className="h-[300px] w-full bg-base-200/50 rounded" />
                     </CardContent>
                  </Card>
               </div>
            </div>

            {/* Quick Stats + Notifications */}
            <div className="grid gap-4 lg:grid-cols-3">
               <div className="lg:col-span-2">
                  <Card className="skeleton-shimmer">
                     <CardContent className="pt-5">
                        <div className="h-[300px] w-full bg-base-200/50 rounded" />
                     </CardContent>
                  </Card>
               </div>
               <Card className="skeleton-shimmer">
                  <CardContent className="pt-5">
                     <div className="flex items-center gap-2 mb-4">
                        <div className="h-4 w-4 bg-base-200 rounded" />
                        <div className="h-4 w-24 bg-base-200 rounded" />
                     </div>
                     <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                           <div key={i} className="flex items-start gap-2.5">
                              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-base-200" />
                              <div className="flex-1 space-y-1">
                                 <div className="h-3.5 w-32 bg-base-200 rounded" />
                                 <div className="h-3 w-full bg-base-200 rounded" />
                                 <div className="h-2.5 w-20 bg-base-200 rounded" />
                              </div>
                           </div>
                        ))}
                     </div>
                  </CardContent>
               </Card>
            </div>
         </div>

         {/* Tabs Skeleton */}
         <div className="space-y-4">
            <div className="h-10 w-full max-w-[760px] bg-base-200 rounded skeleton-shimmer" />
            <TableSkeleton rows={6} />
         </div>
      </section>
   );
}
