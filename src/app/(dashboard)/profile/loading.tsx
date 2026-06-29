import { Card, CardContent } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-5">
        <div>
          <div className="h-7 w-48 bg-base-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-base-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-5 space-y-3">
                <div className="h-5 w-40 bg-base-200 rounded" />
                <div className="h-10 w-full bg-base-200 rounded" />
                <div className="h-10 w-full bg-base-200 rounded" />
                <div className="h-10 w-32 bg-base-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
