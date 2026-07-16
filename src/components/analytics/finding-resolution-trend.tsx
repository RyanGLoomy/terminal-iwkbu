"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TrendData {
   month: string;
   avg_resolution_days: number;
   total_findings: number;
   resolved_findings: number;
}

export function FindingResolutionTrend({ data }: { data: TrendData[] }) {
   if (!data || data.length === 0) {
      return (
         <div className="flex h-[280px] items-center justify-center rounded-xl border border-base-300 bg-base-100">
            <p className="text-sm text-base-content/50">Belum ada data resolusi temuan</p>
         </div>
      );
   }

   return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-5">
         <h3 className="text-sm font-semibold text-base-content mb-4">
            Tren Resolusi Temuan (Rata-rata Hari)
         </h3>
         <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data}>
               <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" />
               <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-base-content)" opacity={0.6} />
               <YAxis tick={{ fontSize: 12 }} stroke="var(--color-base-content)" opacity={0.6} unit=" hari" />
               <Tooltip
                  contentStyle={{
                     backgroundColor: "var(--color-base-100)",
                     border: "1px solid var(--color-base-300)",
                     borderRadius: "8px",
                     fontSize: "13px",
                  }}
               />
               <Legend wrapperStyle={{ fontSize: "13px" }} />
               <Line
                  type="monotone"
                  dataKey="avg_resolution_days"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Rata-rata Hari Resolusi"
                  dot={{ r: 4 }}
               />
               <Line
                  type="monotone"
                  dataKey="total_findings"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Total Temuan"
                  dot={{ r: 4 }}
               />
            </LineChart>
         </ResponsiveContainer>
      </div>
   );
}
