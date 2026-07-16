"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface ComplianceData {
   ready: number;
   needs_review: number;
   blocked: number;
}

const COLORS = {
   ready: "#22c55e",
   needs_review: "#f59e0b",
   blocked: "#ef4444",
};

const LABELS = {
   ready: "Patuh",
   needs_review: "Perlu Tinjauan",
   blocked: "Diblokir",
};

export function PoComplianceChart({ data }: { data: ComplianceData }) {
   const total = data.ready + data.needs_review + data.blocked;

   if (total === 0) {
      return (
         <div className="flex h-[280px] items-center justify-center rounded-xl border border-base-300 bg-base-100">
            <p className="text-sm text-base-content/60">Belum ada data sinkronisasi IWKBU</p>
         </div>
      );
   }

   const chartData = [
      { name: LABELS.ready, value: data.ready, color: COLORS.ready },
      { name: LABELS.needs_review, value: data.needs_review, color: COLORS.needs_review },
      { name: LABELS.blocked, value: data.blocked, color: COLORS.blocked },
   ].filter((d) => d.value > 0);

   return (
      <div className="rounded-xl border border-base-300 bg-base-100 p-5">
         <h3 className="text-sm font-semibold text-base-content mb-4">
            Status Kepatuhan IWKBU
         </h3>
         <ResponsiveContainer width="100%" height={220}>
            <PieChart>
               <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
               >
                  {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
               </Pie>
               <Tooltip
                  contentStyle={{
                     backgroundColor: "var(--color-base-100)",
                     border: "1px solid var(--color-base-300)",
                     borderRadius: "8px",
                     fontSize: "13px",
                  }}
               />
               <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "13px", paddingTop: "8px" }}
               />
            </PieChart>
         </ResponsiveContainer>
         <div className="mt-2 flex justify-center gap-4 text-xs">
            <span className="font-bold text-2xl text-base-content">
               {total > 0 ? Math.round((data.ready / total) * 100) : 0}%
            </span>
            <span className="text-base-content/60 self-center">kepatuhan</span>
         </div>
      </div>
   );
}
