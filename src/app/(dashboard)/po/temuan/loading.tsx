import { DashboardCardsSkeletonGrid } from "@/components/dashboard/dashboard-card-skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function PoTemuanLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-5">
        <div>
          <div className="h-7 w-56 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-80 bg-muted rounded animate-pulse" />
        </div>
        <DashboardCardsSkeletonGrid />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-5">
                <div className="h-5 w-48 bg-muted rounded mb-3" />
                <div className="h-4 w-full bg-muted rounded mb-2" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
