"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface AgingData {
   range: string;
   count: number;
   severity: "low" | "medium" | "high";
}

const SEVERITY_COLOR: Record<string, string> = {
   low: "#3b82f6",
   medium: "#f59e0b",
   high: "#ef4444",
};

export function FindingsAgingChart({ data }: { data: AgingData[] }) {
   if (!data || data.length === 0 || data.every((d) => d.count === 0)) {
      return (
         <div className="flex h-[200px] items-center justify-center rounded-xl border border-base-300 bg-base-100">
            <p className="text-sm text-base-content/50">Tidak ada temuan aktif</p>
         </div>
      );
   }

   return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-5">
         <h3 className="text-sm font-semibold text-base-content mb-4">
            Distribusi Umur Temuan Aktif
         </h3>
         <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} layout="vertical">
               <CartesianGrid strokeDasharray="3 3" stroke="var(--color-base-300)" />
               <XAxis type="number" tick={{ fontSize: 12 }} stroke="var(--color-base-content)" opacity={0.6} />
               <YAxis type="category" dataKey="range" tick={{ fontSize: 11 }} stroke="var(--color-base-content)" opacity={0.6} width={80} />
               <Tooltip
                  contentStyle={{
                     backgroundColor: "var(--color-base-100)",
                     border: "1px solid var(--color-base-300)",
                     borderRadius: "8px",
                     fontSize: "13px",
                  }}
               />
               <Bar dataKey="count" name="Jumlah" radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={SEVERITY_COLOR[entry.severity] ?? "#3b82f6"} />
                  ))}
               </Bar>
            </BarChart>
         </ResponsiveContainer>
      </div>
   );
}
