export default function IwkbuSyncLoading() {
   return (
      <div className="space-y-3">
         <div className="h-6 w-56 bg-base-200 rounded skeleton-shimmer" />
         <div className="h-4 w-full max-w-96 bg-base-200 rounded skeleton-shimmer" />
         <div className="grid gap-4 md:grid-cols-5 mt-6">
            {Array.from({ length: 5 }).map((_, i) => (
               <div
                  key={i}
                  className="h-24 bg-base-200 rounded-md skeleton-shimmer"
               />
            ))}
         </div>
      </div>
   );
}
