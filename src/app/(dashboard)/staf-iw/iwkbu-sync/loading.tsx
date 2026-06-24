export default function IwkbuSyncLoading() {
   return (
      <div className="space-y-3">
         <div className="h-6 w-56 bg-muted rounded animate-pulse" />
         <div className="h-4 w-96 bg-muted rounded animate-pulse" />
         <div className="grid gap-4 md:grid-cols-5 mt-6">
            {Array.from({ length: 5 }).map((_, i) => (
               <div
                  key={i}
                  className="h-24 bg-muted rounded-md animate-pulse"
               />
            ))}
         </div>
      </div>
   );
}
