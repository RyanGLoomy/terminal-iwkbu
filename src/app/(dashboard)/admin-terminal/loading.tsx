import { DashboardCardsSkeletonGrid } from "@/components/dashboard/dashboard-card-skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminTerminalLoading() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <div className="h-7 w-72 bg-base-200 rounded skeleton-shimmer mb-2" />
        <div className="h-4 w-96 bg-base-200 rounded skeleton-shimmer" />
      </div>

      {/* Date picker row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="h-10 w-full sm:w-[180px] bg-base-200 rounded skeleton-shimmer" />
        <div className="h-10 w-full sm:w-[180px] bg-base-200 rounded skeleton-shimmer" />
      </div>

      {/* 5 stat cards */}
      <DashboardCardsSkeletonGrid count={5} columns="sm:grid-cols-2 lg:grid-cols-5" />

      {/* Weekly Trend Chart — single chart */}
      <Card className="skeleton-shimmer">
        <CardContent className="pt-5">
          <div className="h-5 w-48 bg-base-200 rounded mb-4" />
          <div className="h-[300px] w-full bg-base-200/50 rounded" />
        </CardContent>
      </Card>
    </section>
  );
}
