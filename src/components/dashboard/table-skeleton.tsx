import { Card, CardContent } from "@/components/ui/card";

export function TableSkeletonRow() {
  return (
    <div className="flex gap-4 border-b border-base-300/40 px-4 py-3">
      <div className="h-4 w-8 animate-pulse rounded bg-base-200" />
      <div className="h-4 flex-1 animate-pulse rounded bg-base-200" />
      <div className="h-4 w-24 animate-pulse rounded bg-base-200" />
      <div className="h-4 w-20 animate-pulse rounded bg-base-200" />
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="pt-0">
        <div className="flex gap-4 border-b border-base-300/40 bg-base-200/30 px-4 py-3 text-sm font-medium">
          <div className="h-4 w-8 animate-pulse rounded bg-base-200" />
          <div className="h-4 flex-1 animate-pulse rounded bg-base-200" />
          <div className="h-4 w-24 animate-pulse rounded bg-base-200" />
          <div className="h-4 w-20 animate-pulse rounded bg-base-200" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <TableSkeletonRow key={i} />
        ))}
      </CardContent>
    </Card>
  );
}

export function TabsSkeletonContent() {
  return (
    <div className="space-y-4">
      <TableSkeleton rows={5} />
    </div>
  );
}
