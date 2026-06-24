import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/dashboard/table-skeleton";

export default function PencatatanLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-5">
        <div>
          <div className="h-7 w-56 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="animate-pulse">
            <CardContent className="pt-5 space-y-3">
              <div className="h-5 w-48 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
              <div className="h-10 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="pt-5 space-y-3">
              <div className="h-5 w-48 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
              <div className="h-10 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
        <TableSkeleton rows={5} />
      </div>
    </section>
  );
}
