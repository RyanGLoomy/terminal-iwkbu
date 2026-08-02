import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function PencatatanLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-5">
        <div>
          <div className="h-7 w-56 bg-base-200 rounded skeleton-shimmer mb-2" />
          <div className="h-4 w-80 bg-base-200 rounded skeleton-shimmer" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="skeleton-shimmer">
            <CardContent className="pt-5 space-y-3">
              <div className="h-5 w-48 bg-base-200 rounded" />
              <div className="h-10 w-full bg-base-200 rounded" />
              <div className="h-10 w-full bg-base-200 rounded" />
              <div className="h-10 w-32 bg-base-200 rounded" />
            </CardContent>
          </Card>
          <Card className="skeleton-shimmer">
            <CardContent className="pt-5 space-y-3">
              <div className="h-5 w-48 bg-base-200 rounded" />
              <div className="h-10 w-full bg-base-200 rounded" />
              <div className="h-10 w-32 bg-base-200 rounded" />
            </CardContent>
          </Card>
        </div>
        <TableSkeleton rows={5} />
      </div>
    </section>
  );
}
