import { DashboardCardsSkeletonGrid } from "@/components/dashboard/dashboard-card-skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function LoketLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-5">
        <div>
          <div className="h-7 w-56 bg-base-200 rounded skeleton-shimmer mb-2" />
          <div className="h-4 w-80 bg-base-200 rounded skeleton-shimmer" />
        </div>
        <Card className="skeleton-shimmer">
          <CardContent className="flex flex-row items-center justify-between pt-5">
            <div className="flex-1">
              <div className="h-5 w-48 bg-base-200 rounded mb-2" />
              <div className="h-4 w-64 bg-base-200 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-24 bg-base-200 rounded" />
              <div className="h-8 w-24 bg-base-200 rounded" />
            </div>
          </CardContent>
        </Card>
        <DashboardCardsSkeletonGrid count={3} columns="sm:grid-cols-2 lg:grid-cols-3" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="skeleton-shimmer">
            <CardContent className="pt-5">
              <div className="h-5 w-40 bg-base-200 rounded mb-4" />
              <div className="h-[300px] w-full bg-base-200/50 rounded" />
            </CardContent>
          </Card>
          <Card className="skeleton-shimmer">
            <CardContent className="pt-5">
              <div className="h-5 w-40 bg-base-200 rounded mb-4" />
              <div className="h-[300px] w-full bg-base-200/50 rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
