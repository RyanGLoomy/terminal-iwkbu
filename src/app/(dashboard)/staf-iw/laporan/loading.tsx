import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function StafIwLaporanLoading() {
   return (
      <section className="space-y-6">
         <div>
            <div className="h-7 w-64 bg-base-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-full max-w-2xl bg-base-200 rounded animate-pulse" />
         </div>
         <TableSkeleton rows={8} />
      </section>
   );
}
