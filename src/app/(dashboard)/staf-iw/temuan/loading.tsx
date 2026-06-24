import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function StafIwTemuanLoading() {
   return (
      <section className="space-y-6">
         <div className="space-y-5">
            {/* Heading */}
            <div>
               <div className="h-7 w-64 bg-muted rounded animate-pulse mb-2" />
               <div className="h-4 w-full max-w-2xl bg-muted rounded animate-pulse" />
            </div>

            {/* Content Area */}
            <div className="space-y-4">
               {/* Filters/Form Skeleton */}
               <div className="flex gap-3 p-4 border border-border rounded-lg bg-muted/50">
                  <div className="h-10 w-48 bg-muted rounded animate-pulse" />
                  <div className="h-10 w-48 bg-muted rounded animate-pulse" />
                  <div className="h-10 w-32 bg-muted rounded animate-pulse" />
               </div>

               {/* Table */}
               <TableSkeleton rows={6} />
            </div>
         </div>
      </section>
   );
}
