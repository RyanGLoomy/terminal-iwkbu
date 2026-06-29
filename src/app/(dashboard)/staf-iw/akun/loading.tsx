import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function StafIwAkunLoading() {
   return (
      <section className="space-y-6">
         <div className="space-y-5">
            <div>
               <div className="h-7 w-64 rounded bg-base-200 animate-pulse mb-2" />
               <div className="h-4 w-96 rounded bg-base-200 animate-pulse" />
            </div>
            <div className="h-20 w-full max-w-lg rounded bg-base-200 animate-pulse" />
            <TableSkeleton rows={5} />
         </div>
      </section>
   );
}
