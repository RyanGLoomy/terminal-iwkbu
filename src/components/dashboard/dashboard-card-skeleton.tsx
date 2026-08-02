import {
   Card,
   CardContent,
} from "@/components/ui/card";

export function DashboardCardSkeleton({ hasDescription = true }: { hasDescription?: boolean }) {
  return (
    <Card className="skeleton-shimmer">
      <CardContent className="pb-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-base-300/50" />
            <div className="h-7 w-16 rounded bg-base-300/50" />
            {hasDescription && <div className="pt-1 h-3.5 w-28 rounded bg-base-300/50" />}
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-base-300/50 mt-5 bg-base-200/50" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCardsSkeletonGrid({ count = 4, columns, hasDescription = true }: { count?: number; columns?: string; hasDescription?: boolean }) {
  const gridClass = columns ?? "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {Array.from({ length: count }, (_, i) => (
        <DashboardCardSkeleton key={i} hasDescription={hasDescription} />
      ))}
    </div>
  );
}
