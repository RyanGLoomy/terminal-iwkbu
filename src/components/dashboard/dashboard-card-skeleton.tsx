import {
   Card,
   CardContent,
} from "@/components/ui/card";

export function DashboardCardSkeleton() {
  return (
    <Card className="skeleton-shimmer">
      <CardContent className="pt-5 pb-5">
        <div className="space-y-3">
          <div className="h-3.5 w-24 rounded bg-base-300/50" />
          <div className="h-7 w-16 rounded bg-base-300/50" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCardsSkeletonGrid({ count = 4, columns }: { count?: number; columns?: string }) {
  const gridClass = columns ?? "sm:grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {Array.from({ length: count }, (_, i) => (
        <DashboardCardSkeleton key={i} />
      ))}
    </div>
  );
}
