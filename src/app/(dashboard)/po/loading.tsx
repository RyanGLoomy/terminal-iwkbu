
export default function PODashboardLoading() {
   return (
      <section className="space-y-6">
         <div className="space-y-5">
            {/* Heading */}
            <div>
               <div className="h-7 w-56 bg-base-200 rounded animate-pulse" />
            </div>

            {/* Alert Skeleton */}
            <div className="rounded-lg border border-base-300 bg-base-200/50 p-4 animate-pulse">
               <div className="flex gap-3">
                  <div className="h-5 w-5 bg-base-200 rounded" />
                  <div className="flex-1">
                     <div className="h-5 w-32 bg-base-200 rounded mb-2" />
                     <div className="h-4 w-full bg-base-200 rounded" />
                  </div>
               </div>
            </div>
         </div>
      </section>
   );
}
