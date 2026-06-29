
export default function PinPageLoading() {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-center py-20">
        <div className="w-full max-w-sm space-y-5">
          <div className="space-y-2 text-center">
            <div className="h-7 w-48 bg-base-200 rounded animate-pulse mx-auto" />
            <div className="h-4 w-64 bg-base-200 rounded animate-pulse mx-auto" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-20 bg-base-200 rounded animate-pulse" />
            <div className="h-10 w-full bg-base-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-full bg-base-200 rounded animate-pulse" />
        </div>
      </div>
    </section>
  );
}
