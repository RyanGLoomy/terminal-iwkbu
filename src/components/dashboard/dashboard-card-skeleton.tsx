import {
  Card,
  CardContent,
} from "@/components/ui/card";

export function DashboardCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="pt-5 pb-5">
        <div className="space-y-3">
          <div className="h-3.5 w-24 rounded bg-muted" />
          <div className="h-7 w-16 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCardsSkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
      <DashboardCardSkeleton />
    </div>
  );
}
