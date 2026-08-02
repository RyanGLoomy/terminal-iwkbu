import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function RiwayatLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-5">
        <div>
          <div className="h-7 w-56 bg-base-200 rounded skeleton-shimmer mb-2" />
          <div className="h-4 w-80 bg-base-200 rounded skeleton-shimmer" />
        </div>
        <div className="h-10 w-56 bg-base-200 rounded skeleton-shimmer" />
        <TableSkeleton rows={8} />
      </div>
    </section>
  );
}
