"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

interface SyncData {
   id: string;
   status: string;
   started_at: string;
   trigger_type: string;
}

export function SyncSuccessChart({ data }: { data: SyncData[] }) {
   if (!data || data.length === 0) {
      return (
         <div className="flex h-[280px] items-center justify-center rounded-xl border border-base-300 bg-base-100">
            <p className="text-sm text-base-content/50">Belum ada data sinkronisasi IWKBU</p>
         </div>
      );
   }

   const chartData = data.slice(0, 20).reverse().map((d) => ({
      name: new Date(d.started_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      status: d.status,
      fill: d.status === "success" ? "#22c55e" : d.status === "failed" ? "#ef4444" : "#f59e0b",
   }));

   const successCount = data.filter((d) => d.status === "success").length;
   const totalCount = data.length;
   const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

   return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-5">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-base-content">
               Tingkat Keberhasilan Sync IWKBU
            </h3>
            <span className={`text-2xl font-extrabold ${successRate >= 80 ? "text-success" : successRate >= 50 ? "text-warning" : "text-error"}`}>
               {successRate}%
            </span>
         </div>
         <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
               <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" />
               <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--color-base-content)" opacity={0.6} />
               <YAxis hide />
               <Tooltip
                  contentStyle={{
                     backgroundColor: "var(--color-base-100)",
                     border: "1px solid var(--color-base-300)",
                     borderRadius: "8px",
                     fontSize: "13px",
                  }}
               />
               <Bar dataKey="fill" name="Status">
                  {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
               </Bar>
            </BarChart>
         </ResponsiveContainer>
         <div className="mt-2 flex justify-center gap-4 text-xs text-base-content/60">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-success" /> Sukses</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-error" /> Gagal</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-warning" /> Running</span>
         </div>
      </div>
   );
}
