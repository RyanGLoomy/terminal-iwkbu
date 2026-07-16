export default function AnalyticsLoading() {
   return (
      <section className="space-y-6">
         <div className="space-y-2">
            <div className="skeleton h-6 w-48 rounded" />
            <div className="skeleton h-4 w-72 rounded" />
         </div>
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
               <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
         </div>
         <div className="skeleton h-[300px] rounded-xl" />
         <div className="grid gap-4 lg:grid-cols-2">
            <div className="skeleton h-[300px] rounded-xl" />
            <div className="skeleton h-[300px] rounded-xl" />
         </div>
         <div className="skeleton h-[350px] rounded-xl" />
      </section>
   );
}
