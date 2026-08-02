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
          <CardContent className="pt-5">
            <div className="h-10 w-48 bg-base-200 rounded mb-4" />
            <div className="h-4 w-64 bg-base-200 rounded" />
          </CardContent>
        </Card>
        <DashboardCardsSkeletonGrid />
        <Card className="skeleton-shimmer">
          <CardContent className="pt-5">
            <div className="h-5 w-48 bg-base-200 rounded mb-4" />
            <div className="h-48 w-full bg-base-200 rounded" />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
