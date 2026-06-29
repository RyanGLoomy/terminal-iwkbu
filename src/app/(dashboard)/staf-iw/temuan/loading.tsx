import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function StafIwTemuanLoading() {
   return (
      <section className="space-y-6">
         <div className="space-y-5">
            {/* Heading */}
            <div>
               <div className="h-7 w-64 bg-base-200 rounded animate-pulse mb-2" />
               <div className="h-4 w-full max-w-2xl bg-base-200 rounded animate-pulse" />
            </div>

            {/* Content Area */}
            <div className="space-y-4">
               {/* Filters/Form Skeleton */}
               <div className="flex gap-3 p-4 border border-base-300 rounded-lg bg-base-200/50">
                  <div className="h-10 w-48 bg-base-200 rounded animate-pulse" />
                  <div className="h-10 w-48 bg-base-200 rounded animate-pulse" />
                  <div className="h-10 w-32 bg-base-200 rounded animate-pulse" />
               </div>

               {/* Table */}
               <TableSkeleton rows={6} />
            </div>
         </div>
      </section>
   );
}
