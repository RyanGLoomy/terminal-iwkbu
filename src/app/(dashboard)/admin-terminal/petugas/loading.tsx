import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function PetugasLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-5">
        <div>
          <div className="h-7 w-56 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-80 bg-muted rounded animate-pulse" />
        <TableSkeleton rows={5} />
      </div>
    </section>
  );
}
