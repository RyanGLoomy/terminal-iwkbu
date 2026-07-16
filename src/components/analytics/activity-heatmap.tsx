"use client";

interface HeatmapCell {
   day: string;
   hour: number;
   count: number;
}

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function ActivityHeatmap({ data }: { data: { day_of_week: number; hour: number; count: number }[] }) {
   const maxCount = Math.max(...data.map((d) => d.count), 1);

   const getCell = (day: number, hour: number): number => {
      const cell = data.find((d) => d.day_of_week === day && d.hour === hour);
      return cell?.count ?? 0;
   };

   const getIntensity = (count: number): string => {
      if (count === 0) return "bg-base-200/40";
      const ratio = count / maxCount;
      if (ratio > 0.75) return "bg-primary";
      if (ratio > 0.5) return "bg-primary/70";
      if (ratio > 0.25) return "bg-primary/45";
      return "bg-primary/20";
   };

   return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-5">
         <h3 className="text-sm font-semibold text-base-content mb-4">
            Aktivitas per Jam & Hari
         </h3>
         <div className="overflow-x-auto">
            <div className="min-w-[600px]">
               <div className="flex">
                  <div className="w-10 shrink-0" />
                  {HOURS.map((h) => (
                     <div key={h} className="flex-1 text-center text-[10px] text-base-content/40">
                        {h % 3 === 0 ? `${h}` : ""}
                     </div>
                  ))}
               </div>
               {DAYS.map((day, dayIdx) => (
                  <div key={dayIdx} className="flex items-center">
                     <div className="w-10 shrink-0 text-xs text-base-content/60">{day}</div>
                     {HOURS.map((h) => {
                        const count = getCell(dayIdx, h);
                        return (
                           <div
                              key={h}
                              className={`m-0.5 h-6 flex-1 rounded ${getIntensity(count)}`}
                              title={`${day} ${h}:00 — ${count} aksi`}
                           />
                        );
                     })}
                  </div>
               ))}
            </div>
         </div>
         <div className="mt-3 flex items-center justify-end gap-2 text-xs text-base-content/50">
            <span>Low</span>
            <div className="h-3 w-3 rounded bg-base-200/40" />
            <div className="h-3 w-3 rounded bg-primary/20" />
            <div className="h-3 w-3 rounded bg-primary/45" />
            <div className="h-3 w-3 rounded bg-primary/70" />
            <div className="h-3 w-3 rounded bg-primary" />
            <span>High</span>
         </div>
      </div>
   );
}
