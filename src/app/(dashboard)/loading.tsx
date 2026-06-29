export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-base-300 bg-base-100 p-5"
          >
            <div className="h-1.5 w-16 rounded-full bg-base-200" />
            <div className="mt-5 space-y-2">
              <div className="h-3 w-20 rounded bg-base-200" />
              <div className="h-8 w-16 rounded bg-base-200" />
              <div className="h-3 w-32 rounded bg-base-200" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-base-300 bg-base-100 p-5">
        <div className="h-6 w-40 rounded bg-base-200" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-24 rounded bg-base-200" />
              <div className="h-4 w-32 rounded bg-base-200" />
              <div className="h-4 w-20 rounded bg-base-200" />
              <div className="h-4 w-28 rounded bg-base-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
